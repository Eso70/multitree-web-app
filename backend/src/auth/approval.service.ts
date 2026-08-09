import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AuthorizationDecision,
  AuthorizationResource,
} from '@linktree/types';
import { DatabaseService } from '../database/database.service';
import { PERMISSION_BY_KEY, type PermissionKey } from './capabilities';
import { AuthorizationService } from './authorization.service';
import { SecretCryptoService } from './secret-crypto.service';
import { StorageService } from '../storage/storage.service';

const SECRET_FIELDS = new Set([
  'events_token',
  'current_password',
  'new_password',
  'password',
  'confirm_password',
]);

@Injectable()
export class ApprovalService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: AuthorizationService,
    private readonly crypto: SecretCryptoService,
    private readonly storage: StorageService,
  ) {}

  async create(input: {
    businessId: string;
    permission: PermissionKey;
    action: string;
    resource?: AuthorizationResource;
    changes: Record<string, unknown>;
    decision: AuthorizationDecision;
    reason?: string;
  }): Promise<{ id: string; status: 'pending' }> {
    const definition = PERMISSION_BY_KEY.get(input.permission);
    if (!definition?.supportsApproval) {
      throw new ForbiddenException(
        'This operation cannot be submitted for approval',
      );
    }
    const { publicChanges, secrets, hasPassword } = this.splitSecrets(
      input.changes,
    );
    if (hasPassword) {
      throw new ForbiddenException(
        'Passwords are never stored in approval requests',
      );
    }

    const permission = await this.database.query<{ id: string }>(
      `SELECT id::text FROM auth_permissions WHERE permission_key = $1`,
      [input.permission],
    );
    if (!permission.rows[0]) {
      throw new BadRequestException('Permission is not registered');
    }

    const duplicate = await this.database.query<{ id: string }>(
      `SELECT id::text
       FROM permission_approval_requests
       WHERE business_id = $1::uuid
         AND permission_id = $2::uuid
         AND action = $3
         AND resource_id IS NOT DISTINCT FROM $4::uuid
         AND requested_changes = $5::jsonb
         AND status = 'pending'
         AND requested_at > NOW() - INTERVAL '5 minutes'
       ORDER BY requested_at DESC LIMIT 1`,
      [
        input.businessId,
        permission.rows[0].id,
        input.action,
        input.resource?.id || null,
        JSON.stringify(publicChanges),
      ],
    );
    if (duplicate.rows[0]) {
      return { id: duplicate.rows[0].id, status: 'pending' };
    }

    const encryptedSecretPayload = Object.keys(secrets).length
      ? this.crypto.encryptJson(secrets)
      : null;
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO permission_approval_requests
        (business_id, permission_id, action, resource_type, resource_id,
         requested_changes, encrypted_secret_payload, reason, policy_snapshot)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::jsonb,$7,$8,$9::jsonb)
       RETURNING id::text`,
      [
        input.businessId,
        permission.rows[0].id,
        input.action,
        input.resource?.type || null,
        input.resource?.id || null,
        JSON.stringify(publicChanges),
        encryptedSecretPayload,
        input.reason || null,
        JSON.stringify(input.decision),
      ],
    );
    await this.authorization.invalidateBusinessPolicy(input.businessId);
    return { id: result.rows[0].id, status: 'pending' };
  }

  async list(status?: string) {
    const expired = await this.database.query<{
      requested_changes: Record<string, unknown>;
    }>(
      `UPDATE permission_approval_requests
       SET status='expired'
       WHERE status='pending' AND expires_at<=NOW()
       RETURNING requested_changes`,
    );
    await this.storage.deleteUnreferencedFromValues(
      expired.rows.map((row) => row.requested_changes),
    );
    const result = await this.database.query(
      `SELECT request.id::text, request.business_id::text AS "businessId",
              business.name AS "businessName",
              permission.permission_key AS permission,
              request.action, request.resource_type AS "resourceType",
              request.resource_id::text AS "resourceId",
              request.requested_changes AS "requestedChanges",
              request.status, request.reason,
              request.requested_at AS "requestedAt",
              request.reviewed_at AS "reviewedAt",
              reviewer.name AS "reviewedByName",
              request.rejection_reason AS "rejectionReason",
              request.policy_snapshot AS "policySnapshot"
       FROM permission_approval_requests request
       JOIN businesses business ON business.id = request.business_id
       JOIN auth_permissions permission ON permission.id = request.permission_id
       LEFT JOIN platform_admins reviewer ON reviewer.id = request.reviewed_by
       WHERE ($1::text IS NULL OR request.status = $1)
       ORDER BY request.requested_at DESC`,
      [status || null],
    );
    return result.rows;
  }

  async review(input: {
    id: string;
    actorId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
  }) {
    const result = await this.database.transaction(async (client) => {
      const request = await client.query<{
        id: string;
        business_id: string;
        permission_key: PermissionKey;
        action: string;
        resource_type: string | null;
        resource_id: string | null;
        requested_changes: Record<string, unknown>;
        encrypted_secret_payload: Buffer | null;
      }>(
        `SELECT request.id::text, request.business_id::text,
                permission.permission_key, request.action,
                request.resource_type, request.resource_id::text,
                request.requested_changes, request.encrypted_secret_payload
         FROM permission_approval_requests request
         JOIN auth_permissions permission ON permission.id = request.permission_id
         WHERE request.id = $1::uuid AND request.status = 'pending'
           AND request.expires_at > NOW()
         FOR UPDATE`,
        [input.id],
      );
      const row = request.rows[0];
      if (!row)
        throw new NotFoundException('Pending approval request not found');

      if (input.action === 'reject') {
        if (!input.rejectionReason?.trim()) {
          throw new BadRequestException('A rejection reason is required');
        }
        await client.query(
          `UPDATE permission_approval_requests
           SET status='rejected', reviewed_at=NOW(), reviewed_by=$2::uuid,
               rejection_reason=$3
           WHERE id=$1::uuid`,
          [input.id, input.actorId, input.rejectionReason.trim()],
        );
        await this.authorization.invalidateBusinessPolicy(row.business_id);
        return {
          id: input.id,
          status: 'rejected' as const,
          businessId: row.business_id,
          cleanup: row.requested_changes,
          claim: null,
        };
      }

      const secrets = row.encrypted_secret_payload
        ? this.crypto.decryptJson(row.encrypted_secret_payload)
        : {};
      const fullChanges = secrets.__fullChanges;
      const changes =
        fullChanges &&
        typeof fullChanges === 'object' &&
        !Array.isArray(fullChanges)
          ? (fullChanges as Record<string, unknown>)
          : { ...row.requested_changes, ...secrets };
      const decision = await this.authorization.authorize({
        principal: { id: row.business_id, type: 'business' },
        businessId: row.business_id,
        permission: row.permission_key,
        resource: row.resource_type
          ? {
              type: row.resource_type,
              id: row.resource_id || undefined,
              ownerBusinessId: row.business_id,
            }
          : undefined,
        changedFields: this.changedFields(row.permission_key, changes),
        context: { now: new Date() },
      });
      if (!['allow', 'approval'].includes(decision.outcome)) {
        throw new ConflictException(
          `The request is no longer permitted: ${decision.reasonCode}`,
        );
      }

      let cleanup: unknown = null;
      if (row.permission_key === 'business:profile:update') {
        const previous = await client.query(
          `SELECT logo,favicon,default_avatar FROM business_branding
           WHERE business_id=$1::uuid`,
          [row.business_id],
        );
        cleanup = previous.rows[0];
      } else if (
        row.resource_id &&
        ['business:linktrees:update', 'business:linktrees:delete'].includes(
          row.permission_key,
        )
      ) {
        const previous = await client.query(
          `SELECT image,template_config FROM linktrees
           WHERE id=$1::uuid AND business_id=$2::uuid`,
          [row.resource_id, row.business_id],
        );
        cleanup = previous.rows[0];
      }

      await this.executeApprovedMutation(client, {
        businessId: row.business_id,
        permission: row.permission_key,
        resourceId: row.resource_id,
        changes,
      });
      await client.query(
        `UPDATE permission_approval_requests
         SET status='approved', reviewed_at=NOW(), reviewed_by=$2::uuid
         WHERE id=$1::uuid`,
        [input.id, input.actorId],
      );
      await client.query(
        `INSERT INTO billing_policy_audit_events
          (event_type, actor_id, business_id, resource_type, resource_id,
           before_value, after_value)
         VALUES ('approval.approved',$1::uuid,$2::uuid,'permission-approval',
                 $3::uuid,NULL,$4::jsonb)`,
        [
          input.actorId,
          row.business_id,
          input.id,
          JSON.stringify({
            permission: row.permission_key,
            fields: Object.keys(changes),
          }),
        ],
      );
      await this.authorization.invalidateBusinessPolicy(row.business_id);
      return {
        id: input.id,
        status: 'approved' as const,
        businessId: row.business_id,
        cleanup,
        claim: changes,
      };
    });
    if (result.claim) {
      await this.storage.claimBusinessAssets(result.businessId, result.claim);
    }
    await this.storage.deleteUnreferencedFromValues(result.cleanup);
    return { id: result.id, status: result.status };
  }

  private async executeApprovedMutation(
    client: Parameters<Parameters<DatabaseService['transaction']>[0]>[0],
    input: {
      businessId: string;
      permission: PermissionKey;
      resourceId: string | null;
      changes: Record<string, unknown>;
    },
  ): Promise<void> {
    if (input.permission === 'business:profile:update') {
      await this.consumeProfileChangeQuota(client, input.businessId);
      await client.query(
        `UPDATE businesses SET
           name = COALESCE($2, name),
           phone = CASE WHEN $3::boolean THEN $4 ELSE phone END,
           updated_at = NOW()
         WHERE id = $1::uuid`,
        [
          input.businessId,
          this.optionalString(input.changes.name),
          Object.hasOwn(input.changes, 'phone'),
          this.optionalString(input.changes.phone),
        ],
      );
      await client.query(
        `INSERT INTO business_branding
          (business_id,logo,favicon,default_avatar,website_color)
         VALUES ($1::uuid,$2,$3,$4,$5)
         ON CONFLICT (business_id) DO UPDATE SET
           logo=CASE WHEN $6 THEN EXCLUDED.logo ELSE business_branding.logo END,
           favicon=CASE WHEN $7 THEN EXCLUDED.favicon ELSE business_branding.favicon END,
           default_avatar=CASE WHEN $8 THEN EXCLUDED.default_avatar ELSE business_branding.default_avatar END,
           website_color=CASE WHEN $9 THEN EXCLUDED.website_color ELSE business_branding.website_color END,
           updated_at=NOW()`,
        [
          input.businessId,
          this.optionalString(input.changes.logo),
          this.optionalString(input.changes.favicon),
          this.optionalString(input.changes.default_avatar),
          this.optionalString(input.changes.website_color),
          Object.hasOwn(input.changes, 'logo'),
          Object.hasOwn(input.changes, 'favicon'),
          Object.hasOwn(input.changes, 'default_avatar'),
          Object.hasOwn(input.changes, 'website_color'),
        ],
      );
      return;
    }
    if (input.permission === 'business:defaults:update') {
      await client.query(
        `INSERT INTO business_defaults
          (business_id,footer_text,footer_phone,template_key,background_color,
           footer_hidden,whatsapp_enabled)
         VALUES ($1::uuid,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (business_id) DO UPDATE SET
           footer_text=CASE WHEN $8 THEN EXCLUDED.footer_text ELSE business_defaults.footer_text END,
           footer_phone=CASE WHEN $9 THEN EXCLUDED.footer_phone ELSE business_defaults.footer_phone END,
           template_key=CASE WHEN $10 THEN EXCLUDED.template_key ELSE business_defaults.template_key END,
           background_color=CASE WHEN $11 THEN EXCLUDED.background_color ELSE business_defaults.background_color END,
           footer_hidden=CASE WHEN $12 THEN EXCLUDED.footer_hidden ELSE business_defaults.footer_hidden END,
           whatsapp_enabled=CASE WHEN $13 THEN EXCLUDED.whatsapp_enabled ELSE business_defaults.whatsapp_enabled END,
           updated_at=NOW()`,
        [
          input.businessId,
          this.optionalString(input.changes.default_footer_text),
          this.optionalString(input.changes.default_footer_phone),
          this.optionalString(input.changes.default_template),
          this.optionalString(input.changes.default_background_color),
          this.optionalBoolean(input.changes.default_footer_hidden),
          this.optionalBoolean(input.changes.default_whatsapp_enabled),
          Object.hasOwn(input.changes, 'default_footer_text'),
          Object.hasOwn(input.changes, 'default_footer_phone'),
          Object.hasOwn(input.changes, 'default_template'),
          Object.hasOwn(input.changes, 'default_background_color'),
          Object.hasOwn(input.changes, 'default_footer_hidden'),
          Object.hasOwn(input.changes, 'default_whatsapp_enabled'),
        ],
      );
      return;
    }
    if (
      input.permission === 'business:tiktok:update' ||
      input.permission === 'business:tiktok:create'
    ) {
      const rawConfigs = Array.isArray(input.changes.tiktok_configs)
        ? input.changes.tiktok_configs
        : [input.changes];
      const configs = rawConfigs.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw new BadRequestException('Invalid TikTok configuration');
        }
        const row = item as Record<string, unknown>;
        const id =
          typeof row.id === 'string' && /^[0-9a-f-]{36}$/i.test(row.id)
            ? row.id
            : undefined;
        const pixelId =
          typeof row.pixel_id === 'string' ? row.pixel_id.trim() : '';
        if (!pixelId) {
          throw new BadRequestException('Pixel ID is required');
        }
        if (!/^[A-Za-z0-9_-]{8,255}$/.test(pixelId)) {
          throw new BadRequestException('Invalid TikTok Pixel ID');
        }
        const token =
          typeof row.events_token === 'string' ? row.events_token.trim() : '';
        return {
          id,
          pixelId,
          token: token.startsWith('••••') ? '' : token.slice(0, 4096),
          keepToken: row.keep_events_token === true || token.startsWith('••••'),
          displayOrder: index,
        };
      });
      if (
        new Set(configs.map((config) => config.pixelId)).size !== configs.length
      ) {
        throw new BadRequestException('TikTok Pixel IDs must be unique');
      }
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,
        [`tiktok:${input.businessId}`],
      );
      const existingResult = await client.query<{
        id: string;
        pixel_id: string;
        encrypted_events_token: Buffer | null;
        token_last_four: string | null;
      }>(
        `SELECT id, pixel_id, encrypted_events_token, token_last_four
         FROM business_tiktok_pixels
         WHERE business_id=$1::uuid
         FOR UPDATE`,
        [input.businessId],
      );
      const existingById = new Map(
        existingResult.rows.map((row) => [row.id, row]),
      );
      const existingByPixelId = new Map(
        existingResult.rows.map((row) => [row.pixel_id, row]),
      );
      const retainedIds: string[] = [];

      for (const config of configs) {
        const token = config.token || '';
        const existing =
          (config.id && existingById.get(config.id)) ||
          existingByPixelId.get(config.pixelId);
        const preserveToken =
          config.keepToken && existing?.encrypted_events_token;
        const encryptedToken = token
          ? this.crypto.encryptJson({ events_token: token })
          : preserveToken || null;
        const tokenLastFour = token
          ? token.slice(-4)
          : preserveToken
            ? existing?.token_last_four || null
            : null;
        const saved = existing
          ? await client.query<{ id: string }>(
              `UPDATE business_tiktok_pixels
               SET pixel_id=$3,
                   encrypted_events_token=$4,
                   token_last_four=$5,
                   display_order=$6,
                   status='active',
                   updated_at=NOW()
               WHERE id=$1::uuid AND business_id=$2::uuid
               RETURNING id`,
              [
                existing.id,
                input.businessId,
                config.pixelId,
                encryptedToken,
                tokenLastFour,
                config.displayOrder,
              ],
            )
          : await client.query<{ id: string }>(
              `INSERT INTO business_tiktok_pixels
                (business_id,pixel_id,encrypted_events_token,token_last_four,display_order,status)
               VALUES ($1::uuid,$2,$3,$4,$5,'active')
               RETURNING id`,
              [
                input.businessId,
                config.pixelId,
                encryptedToken,
                tokenLastFour,
                config.displayOrder,
              ],
            );
        retainedIds.push(saved.rows[0].id);
      }
      await client.query(
        `UPDATE business_tiktok_pixels
         SET status='inactive', updated_at=NOW()
         WHERE business_id=$1::uuid
           AND NOT (id = ANY($2::uuid[]))`,
        [input.businessId, retainedIds],
      );

      return;
    }
    if (input.permission === 'business:tiktok:delete' && input.resourceId) {
      await client.query(
        `DELETE FROM business_tiktok_pixels
         WHERE id=$1::uuid AND business_id=$2::uuid`,
        [input.resourceId, input.businessId],
      );
      return;
    }
    if (input.permission === 'business:linktrees:update' && input.resourceId) {
      const columns: Record<string, string> = {
        name: 'name',
        subtitle: 'subtitle',
        seo_name: 'seo_name',
        image: 'image',
        background_color: 'background_color',
        footer_text: 'footer_text',
        footer_phone: 'footer_phone',
        footer_hidden: 'footer_hidden',
      };
      const assignments: string[] = [];
      const parameters: unknown[] = [input.resourceId, input.businessId];
      for (const [field, column] of Object.entries(columns)) {
        if (!Object.hasOwn(input.changes, field)) continue;
        parameters.push(input.changes[field]);
        assignments.push(`${column}=$${parameters.length}`);
      }
      if (Object.hasOwn(input.changes, 'template_config')) {
        parameters.push(JSON.stringify(input.changes.template_config || {}));
        assignments.push(`template_config=$${parameters.length}::jsonb`);
        const config = input.changes.template_config;
        if (config && typeof config === 'object' && !Array.isArray(config)) {
          const templateKey = (config as Record<string, unknown>).templateKey;
          if (typeof templateKey === 'string') {
            parameters.push(templateKey);
            assignments.push(`template_key=$${parameters.length}`);
          }
        }
      }
      if (assignments.length) {
        await client.query(
          `UPDATE linktrees SET ${assignments.join(',')},updated_at=NOW()
           WHERE id=$1::uuid AND business_id=$2::uuid`,
          parameters,
        );
      }
      return;
    }
    if (input.permission === 'business:linktrees:delete' && input.resourceId) {
      const deleted = await client.query(
        `DELETE FROM linktrees
         WHERE id=$1::uuid AND business_id=$2::uuid AND is_default=FALSE
         RETURNING id`,
        [input.resourceId, input.businessId],
      );
      if (!deleted.rowCount) {
        throw new ConflictException(
          'The linktree is missing, owned by another business, or protected as default',
        );
      }
      return;
    }
    if (input.permission === 'business:links:update' && input.resourceId) {
      const columns: Record<string, string> = {
        platform: 'platform',
        url: 'url',
        display_name: 'display_name',
        description: 'description',
        default_message: 'default_message',
        display_order: 'display_order',
      };
      const assignments: string[] = [];
      const parameters: unknown[] = [input.resourceId, input.businessId];
      for (const [field, column] of Object.entries(columns)) {
        if (!Object.hasOwn(input.changes, field)) continue;
        parameters.push(input.changes[field]);
        assignments.push(`${column}=$${parameters.length}`);
      }
      if (assignments.length) {
        const updated = await client.query(
          `UPDATE links SET ${assignments.join(',')},updated_at=NOW()
           WHERE id=$1::uuid AND business_id=$2::uuid RETURNING id`,
          parameters,
        );
        if (!updated.rowCount) throw new ConflictException('Link not found');
      }
      return;
    }
    if (input.permission === 'business:links:delete' && input.resourceId) {
      const deleted = await client.query(
        `DELETE FROM links
         WHERE id=$1::uuid AND business_id=$2::uuid RETURNING id`,
        [input.resourceId, input.businessId],
      );
      if (!deleted.rowCount) throw new ConflictException('Link not found');
      return;
    }
    if (input.permission === 'business:links:sync' && input.resourceId) {
      const rawLinks = Array.isArray(input.changes.links)
        ? input.changes.links
        : Array.isArray(input.changes.createLinks)
          ? input.changes.createLinks
          : [];
      const owner = await client.query(
        `SELECT 1 FROM linktrees WHERE id=$1::uuid AND business_id=$2::uuid`,
        [input.resourceId, input.businessId],
      );
      if (!owner.rowCount) throw new ConflictException('Linktree not found');
      await client.query(`DELETE FROM links WHERE linktree_id=$1::uuid`, [
        input.resourceId,
      ]);
      for (const [index, raw] of rawLinks.entries()) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const link = raw as Record<string, unknown>;
        const platform =
          typeof link.platform === 'string' ? link.platform.trim() : '';
        const url = typeof link.url === 'string' ? link.url.trim() : '';
        if (!platform || !url) {
          throw new BadRequestException(
            'Every synchronized link needs a platform and URL',
          );
        }
        await client.query(
          `INSERT INTO links
            (linktree_id,business_id,platform,url,display_name,description,
             default_message,display_order)
           VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8)`,
          [
            input.resourceId,
            input.businessId,
            platform,
            url,
            typeof link.display_name === 'string' ? link.display_name : null,
            typeof link.description === 'string' ? link.description : null,
            typeof link.default_message === 'string'
              ? link.default_message
              : null,
            index,
          ],
        );
      }
      return;
    }
    if (
      input.permission === 'business:analytics:clear-linktree' &&
      input.resourceId
    ) {
      const page = await client.query<{ id: string }>(
        `SELECT id FROM public_pages
         WHERE business_id=$1::uuid
           AND (id=$2::uuid OR source_linktree_id=$2::uuid OR source_mini_website_id=$2::uuid)`,
        [input.businessId, input.resourceId],
      );
      if (page.rows[0]) {
        await client.query(
          `DELETE FROM analytics_events
           WHERE business_id=$1::uuid AND public_page_id=$2::uuid`,
          [input.businessId, page.rows[0].id],
        );
        await client.query(
          `DELETE FROM analytics_page_daily
           WHERE business_id=$1::uuid AND public_page_id=$2::uuid`,
          [input.businessId, page.rows[0].id],
        );
        await client.query(
          `DELETE FROM analytics_action_daily
           WHERE business_id=$1::uuid AND public_page_id=$2::uuid`,
          [input.businessId, page.rows[0].id],
        );
      }
      return;
    }
    if (input.permission === 'business:analytics:clear-all') {
      await client.query(
        'DELETE FROM analytics_events WHERE business_id=$1::uuid',
        [input.businessId],
      );
      await client.query(
        'DELETE FROM analytics_page_daily WHERE business_id=$1::uuid',
        [input.businessId],
      );
      await client.query(
        'DELETE FROM analytics_action_daily WHERE business_id=$1::uuid',
        [input.businessId],
      );
      return;
    }
    throw new ConflictException(
      'This approval type requires an application-specific executor',
    );
  }

  private splitSecrets(changes: Record<string, unknown>): {
    publicChanges: Record<string, unknown>;
    secrets: Record<string, unknown>;
    hasPassword: boolean;
  } {
    let containsSecret = false;
    let hasPassword = false;
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redact);
      if (!value || typeof value !== 'object') return value;
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (SECRET_FIELDS.has(key)) {
          containsSecret = true;
          if (
            [
              'current_password',
              'new_password',
              'password',
              'confirm_password',
            ].includes(key)
          ) {
            hasPassword = true;
          }
          result[key] = '[encrypted]';
        } else {
          result[key] = redact(child);
        }
      }
      return result;
    };
    const publicChanges = redact(changes) as Record<string, unknown>;
    const secrets = containsSecret ? { __fullChanges: changes } : {};
    return { publicChanges, secrets, hasPassword };
  }

  private changedFields(
    permission: PermissionKey,
    changes: Record<string, unknown>,
  ): string[] | undefined {
    if (permission === 'business:tiktok:update') {
      return ['pixel_id', 'events_token'];
    }
    const definition = PERMISSION_BY_KEY.get(permission);
    return definition?.fields ? Object.keys(changes) : undefined;
  }

  private optionalString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private optionalBoolean(value: unknown): boolean {
    return value === true;
  }

  private async consumeProfileChangeQuota(
    client: Parameters<Parameters<DatabaseService['transaction']>[0]>[0],
    businessId: string,
  ): Promise<void> {
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, [
      `profile-change:${businessId}`,
    ]);
    const entitlement = await client.query<{ value: number | null }>(
      `SELECT COALESCE(plan_value.value, '0'::jsonb) AS value
       FROM business_subscriptions subscription
       JOIN billing_entitlements entitlement
         ON entitlement.entitlement_key='limit.profile_changes_monthly'
       LEFT JOIN billing_plan_entitlements plan_value
         ON plan_value.plan_configuration_id =
            subscription.plan_configuration_id
        AND plan_value.entitlement_id=entitlement.id
       WHERE subscription.business_id=$1::uuid`,
      [businessId],
    );
    const limit = Number(entitlement.rows[0]?.value ?? 0);
    const usage = await client.query<{ used: number }>(
      `SELECT COALESCE(SUM(used),0)::int AS used
       FROM billing_usage_counters
       WHERE business_id=$1::uuid
         AND entitlement_key='limit.profile_changes_monthly'
         AND period_start<=NOW() AND period_end>NOW()`,
      [businessId],
    );
    if (limit !== -1 && Number(usage.rows[0]?.used || 0) >= limit) {
      throw new ConflictException(
        'The monthly profile change limit is exhausted',
      );
    }
    await client.query(
      `INSERT INTO billing_usage_counters
        (business_id,entitlement_key,period_start,period_end,used)
       VALUES (
         $1::uuid,'limit.profile_changes_monthly',
         date_trunc('month',NOW()),
         date_trunc('month',NOW()) + INTERVAL '1 month',1
       )
       ON CONFLICT (business_id,entitlement_key,period_start)
       DO UPDATE SET used=billing_usage_counters.used+1,updated_at=NOW()`,
      [businessId],
    );
  }
}
