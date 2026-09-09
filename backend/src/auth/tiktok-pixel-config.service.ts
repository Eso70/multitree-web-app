import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { SecretCryptoService } from './secret-crypto.service';

export interface TikTokPixelConfigInput {
  id?: string;
  pixel_id: string;
  events_token?: string;
  keep_events_token?: boolean;
}

export interface TikTokPixelConfigView {
  id: string;
  pixel_id: string;
  token_last_four: string | null;
  has_events_token: boolean;
  status: 'active' | 'inactive';
}

export interface TikTokPixelReplaceOptions {
  maxGroups?: 1 | 2 | 3;
}

/**
 * Owner-neutral persistence for TikTok Pixel groups.
 *
 * Customer businesses and the internal platform workspace use the same
 * encrypted destination model. Callers are responsible for resolving the
 * owner id server-side and for applying their own authorization and limits.
 */
@Injectable()
export class TikTokPixelConfigService {
  constructor(
    private readonly database: DatabaseService,
    private readonly secrets: SecretCryptoService,
  ) {}

  normalize(
    value: unknown,
    maxGroups: 1 | 2 | 3 = 3,
  ): TikTokPixelConfigInput[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('TikTok configurations must be an array');
    }
    if (value.length > maxGroups) {
      throw new BadRequestException(
        `At most ${maxGroups} TikTok Pixel group${maxGroups === 1 ? '' : 's'} ${maxGroups === 1 ? 'is' : 'are'} allowed`,
      );
    }

    const configs = value.map((item) => {
      const row =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {};
      const id = typeof row.id === 'string' ? row.id.trim() : '';
      const pixelId =
        typeof row.pixel_id === 'string' ? row.pixel_id.trim() : '';
      const token =
        typeof row.events_token === 'string' ? row.events_token.trim() : '';
      return {
        ...(id && /^[0-9a-f-]{36}$/i.test(id) ? { id } : {}),
        pixel_id: pixelId,
        ...(token && !token.startsWith('••••')
          ? { events_token: token.slice(0, 4096) }
          : {}),
        keep_events_token:
          row.keep_events_token === true || token.startsWith('••••'),
      };
    });

    if (configs.some((config) => !config.pixel_id)) {
      throw new BadRequestException('Pixel ID is required');
    }
    if (
      configs.some((config) => !/^[A-Za-z0-9_-]{8,255}$/.test(config.pixel_id))
    ) {
      throw new BadRequestException('Invalid TikTok Pixel ID');
    }
    if (
      new Set(configs.map((config) => config.pixel_id)).size !== configs.length
    ) {
      throw new BadRequestException('TikTok Pixel IDs must be unique');
    }
    return configs;
  }

  async list(ownerId: string): Promise<TikTokPixelConfigView[]> {
    const result = await this.database.query<{
      id: string;
      pixel_id: string;
      token_last_four: string | null;
      status: 'active' | 'inactive';
    }>(
      `SELECT id::text, pixel_id, token_last_four, status
         FROM business_tiktok_pixels
        WHERE business_id = $1::uuid AND status = 'active'
        ORDER BY display_order ASC, created_at ASC`,
      [ownerId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      pixel_id: row.pixel_id,
      token_last_four: row.token_last_four,
      has_events_token: Boolean(row.token_last_four),
      status: row.status,
    }));
  }

  async getSecret(
    ownerId: string,
    id: string,
  ): Promise<{ events_token: string; token_last_four: string | null }> {
    const result = await this.database.query<{
      encrypted_events_token: Buffer | null;
      token_last_four: string | null;
    }>(
      `SELECT encrypted_events_token, token_last_four
         FROM business_tiktok_pixels
        WHERE business_id = $1::uuid
          AND id = $2::uuid
          AND status = 'active'`,
      [ownerId, id],
    );
    const row = result.rows[0];
    if (!row) {
      throw new BadRequestException('TikTok pixel not found');
    }
    if (!row.encrypted_events_token) {
      return { events_token: '', token_last_four: row.token_last_four };
    }
    const decrypted = this.secrets.decryptJson(row.encrypted_events_token);
    const token = decrypted.events_token ?? decrypted.legacyValue;
    if (typeof token !== 'string' || !token) {
      throw new BadRequestException('TikTok token cannot be decrypted');
    }
    return {
      events_token: token,
      token_last_four: row.token_last_four,
    };
  }

  async replace(
    ownerId: string,
    value: unknown,
    options: TikTokPixelReplaceOptions = {},
  ): Promise<TikTokPixelConfigView[]> {
    const configs = this.normalize(value, options.maxGroups);
    await this.database.transaction((client) =>
      this.replaceWithClient(client, ownerId, configs),
    );
    return this.list(ownerId);
  }

  async replaceWithClient(
    client: PoolClient,
    ownerId: string,
    configs: TikTokPixelConfigInput[],
  ): Promise<void> {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`tiktok:${ownerId}`],
    );
    const existingResult = await client.query<{
      id: string;
      pixel_id: string;
      encrypted_events_token: Buffer | null;
      token_last_four: string | null;
    }>(
      `SELECT id::text, pixel_id, encrypted_events_token, token_last_four
         FROM business_tiktok_pixels
        WHERE business_id = $1::uuid
        FOR UPDATE`,
      [ownerId],
    );
    const byId = new Map(existingResult.rows.map((row) => [row.id, row]));
    const byPixelId = new Map(
      existingResult.rows.map((row) => [row.pixel_id, row]),
    );
    const retainedIds: string[] = [];

    for (const [index, config] of configs.entries()) {
      const existing =
        (config.id && byId.get(config.id)) || byPixelId.get(config.pixel_id);
      const encryptedToken = config.events_token
        ? this.secrets.encryptJson({ events_token: config.events_token })
        : config.keep_events_token
          ? existing?.encrypted_events_token || null
          : null;
      const tokenLastFour = config.events_token
        ? config.events_token.slice(-4)
        : config.keep_events_token
          ? existing?.token_last_four || null
          : null;
      const saved = existing
        ? await client.query<{ id: string }>(
            `UPDATE business_tiktok_pixels
                SET pixel_id = $3, encrypted_events_token = $4,
                    token_last_four = $5, display_order = $6,
                    status = 'active', updated_at = NOW()
              WHERE id = $1::uuid AND business_id = $2::uuid
              RETURNING id::text`,
            [
              existing.id,
              ownerId,
              config.pixel_id,
              encryptedToken,
              tokenLastFour,
              index,
            ],
          )
        : await client.query<{ id: string }>(
            `INSERT INTO business_tiktok_pixels
               (business_id, pixel_id, encrypted_events_token, token_last_four,
                display_order, status)
             VALUES ($1::uuid, $2, $3, $4, $5, 'active')
             RETURNING id::text`,
            [ownerId, config.pixel_id, encryptedToken, tokenLastFour, index],
          );
      retainedIds.push(saved.rows[0].id);
    }

    await client.query(
      `UPDATE business_tiktok_pixels
          SET status = 'inactive', updated_at = NOW()
        WHERE business_id = $1::uuid
          AND NOT (id = ANY($2::uuid[]))`,
      [ownerId, retainedIds],
    );
  }

  async testEventsApi(
    ownerId: string,
    input: {
      test_event_code: string;
      pixel_id?: string;
      event_name?: string;
    },
    context?: { ip?: string; userAgent?: string },
  ): Promise<{
    success: boolean;
    statusCode: number;
    tiktokCode: number | null;
    message: string;
    requestId: string | null;
    pixelId: string;
    testEventCode: string;
    eventName: string;
    sentAt: string;
  }> {
    const testEventCode = (input.test_event_code || '').trim();
    if (!testEventCode) {
      throw new BadRequestException('test_event_code is required');
    }

    const result = await this.database.query<{
      id: string;
      pixel_id: string;
      encrypted_events_token: Buffer | null;
    }>(
      `SELECT id::text, pixel_id, encrypted_events_token
         FROM business_tiktok_pixels
        WHERE business_id = $1::uuid
          AND status = 'active'
          AND ($2::text IS NULL OR pixel_id = $2::text)
        ORDER BY display_order ASC, created_at ASC`,
      [ownerId, input.pixel_id ? input.pixel_id.trim() : null],
    );

    const eventName = input.event_name || 'ViewContent';

    if (result.rows.length === 0) {
      return {
        success: false,
        statusCode: 404,
        tiktokCode: null,
        message: input.pixel_id
          ? `TikTok Pixel ID '${input.pixel_id}' is not configured or inactive.`
          : 'No active TikTok Pixel configuration found for this account.',
        requestId: null,
        pixelId: input.pixel_id || '',
        testEventCode,
        eventName,
        sentAt: new Date().toISOString(),
      };
    }

    const targetPixel =
      result.rows.find((r) => r.encrypted_events_token !== null) ??
      result.rows[0];

    if (!targetPixel.encrypted_events_token) {
      return {
        success: false,
        statusCode: 400,
        tiktokCode: null,
        message: `TikTok Pixel '${targetPixel.pixel_id}' does not have an Events API token configured. Please add and save your Events API Access Token first.`,
        requestId: null,
        pixelId: targetPixel.pixel_id,
        testEventCode,
        eventName,
        sentAt: new Date().toISOString(),
      };
    }

    const decrypted = this.secrets.decryptJson(
      targetPixel.encrypted_events_token,
    );
    const rawToken = decrypted.events_token ?? decrypted.legacyValue;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return {
        success: false,
        statusCode: 400,
        tiktokCode: null,
        message: 'Stored Events API token could not be decrypted or is empty.',
        requestId: null,
        pixelId: targetPixel.pixel_id,
        testEventCode,
        eventName,
        sentAt: new Date().toISOString(),
      };
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = crypto.randomUUID();
    const externalId = createHash('sha256')
      .update(`test-user-${ownerId}`)
      .digest('hex');

    const properties =
      eventName === 'Contact'
        ? {
            content_type: 'contact',
            content_name: 'WhatsApp Contact',
          }
        : eventName === 'ClickButton'
          ? {
              content_type: 'button',
              content_name: 'Link Click',
            }
          : {
              content_type: 'linktree',
              content_name: 'Public Page',
            };

    const requestBody = {
      event_source: 'web',
      event_source_id: targetPixel.pixel_id,
      test_event_code: testEventCode,
      data: [
        {
          event: eventName,
          event_time: eventTime,
          event_id: eventId,
          user: {
            ip: context?.ip || '127.0.0.1',
            user_agent: context?.userAgent || 'Sponsor.krd-EventsAPI/1.0',
            ttclid: 'test_ttclid_diagnostic',
            ttp: 'test_ttp_diagnostic',
            external_id: externalId,
          },
          page: {
            url: 'https://sponsor.krd/',
            referrer: 'https://www.tiktok.com/',
          },
          properties,
        },
      ],
    };

    try {
      const response = await fetch(
        'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': token,
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const text = await response.text();
      let parsed: {
        code?: number;
        message?: string;
        request_id?: string;
        requestId?: string;
      } = {};
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch {
        // non-JSON response from provider
      }

      const tiktokCode = typeof parsed.code === 'number' ? parsed.code : null;
      const requestId = parsed.request_id || parsed.requestId || null;
      const tiktokMessage =
        parsed.message ||
        text.replace(/\s+/g, ' ').trim() ||
        `HTTP ${response.status}`;
      const success = response.ok && (tiktokCode === 0 || tiktokCode === null);

      return {
        success,
        statusCode: response.status,
        tiktokCode,
        message: tiktokMessage,
        requestId,
        pixelId: targetPixel.pixel_id,
        testEventCode,
        eventName,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 502,
        tiktokCode: null,
        message:
          error instanceof Error
            ? error.message
            : 'Network request to TikTok Events API failed',
        requestId: null,
        pixelId: targetPixel.pixel_id,
        testEventCode,
        eventName,
        sentAt: new Date().toISOString(),
      };
    }
  }
}
