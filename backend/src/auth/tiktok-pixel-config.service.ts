import { BadRequestException, Injectable } from '@nestjs/common';
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

  normalize(value: unknown): TikTokPixelConfigInput[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('TikTok configurations must be an array');
    }
    if (value.length > 3) {
      throw new BadRequestException(
        'At most three TikTok Pixel groups are allowed',
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

  async replace(
    ownerId: string,
    value: unknown,
  ): Promise<TikTokPixelConfigView[]> {
    const configs = this.normalize(value);
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
}
