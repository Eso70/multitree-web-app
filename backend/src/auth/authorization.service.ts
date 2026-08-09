import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  AccessMode,
  AuthorizationDecision,
  AuthorizationRequest,
  EffectiveAccessManifest,
  EffectivePermission,
} from '@linktree/types';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import {
  isPermissionKey,
  PERMISSION_BY_KEY,
  PERMISSION_CATALOG,
  type Capability,
  type PermissionKey,
} from './capabilities';
import type { SessionUser } from './session.service';

export interface AuthorizationContext {
  scopeType: 'platform' | 'business';
  scopeId?: string | null;
  subjectType?: 'platform-admin' | 'business' | 'api-client';
  ipAddress?: string | null;
  at?: Date;
}

interface SubscriptionRow {
  business_status: string;
  subscription_id: string;
  subscription_status: string;
  plan_id: string;
  plan_code: string;
  plan_name: string;
  plan_configuration_id: string;
  current_period_end: Date | string | null;
}

interface PermissionPolicyRow {
  permission_key: PermissionKey;
  field_schema: Record<string, string>;
  plan_access_mode: AccessMode | null;
  plan_field_modes: Record<string, AccessMode> | null;
  plan_resource_scope: Record<string, unknown> | null;
  plan_conditions: Record<string, unknown> | null;
}

interface EffectiveRule {
  key: PermissionKey;
  accessMode: AccessMode;
  fieldModes: Record<string, AccessMode>;
  resourceScope: Record<string, unknown>;
  conditions: Record<string, unknown>;
  source: 'plan';
}

interface BusinessPolicy {
  subscription: SubscriptionRow;
  permissions: Record<string, EffectiveRule>;
  entitlements: Record<string, boolean | number | string>;
  templateKeys: string[];
  pendingApprovals: EffectiveAccessManifest['pendingApprovals'];
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'trialing',
  'active',
  'grace_period',
]);

@Injectable()
export class AuthorizationService implements OnModuleInit {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    const result = await this.database.query<{ permission_key: string }>(
      `SELECT permission_key FROM auth_permissions
       WHERE permission_key = ANY($1::text[])`,
      [PERMISSION_CATALOG.map((item) => item.key)],
    );
    const registered = new Set(result.rows.map((row) => row.permission_key));
    const missing = PERMISSION_CATALOG.filter(
      (item) => !registered.has(item.key),
    ).map((item) => item.key);
    if (missing.length) {
      throw new Error(
        `Permission catalog migration is incomplete. Missing: ${missing.join(', ')}`,
      );
    }
    this.logger.log(
      `Validated ${PERMISSION_CATALOG.length} application permission definitions`,
    );
  }

  async authorize(
    request: AuthorizationRequest,
  ): Promise<AuthorizationDecision> {
    if (request.principal.type === 'platform-admin') {
      return this.allow('platform-role');
    }
    if (!isPermissionKey(request.permission)) {
      return this.deny('NO_PERMISSION', 'plan');
    }
    const now =
      request.context.now instanceof Date
        ? request.context.now
        : new Date(request.context.now);
    const normalizedRequest = {
      ...request,
      permission: request.permission,
      context: { ...request.context, now },
    };

    return this.authorizeBusiness(normalizedRequest);
  }

  async hasAll(
    user: SessionUser,
    required: readonly Capability[],
    context: AuthorizationContext,
  ): Promise<boolean> {
    if (!required.length) return true;
    const decisions = await Promise.all(
      required.map((permission) =>
        this.authorize({
          principal: {
            id: user.id,
            type: user.role === 'business' ? 'business' : 'platform-admin',
          },
          businessId:
            user.role === 'business'
              ? context.scopeId || user.id
              : context.scopeId || undefined,
          permission,
          context: {
            ipAddress: context.ipAddress || undefined,
            now: context.at || new Date(),
          },
        }),
      ),
    );
    return decisions.every((decision) => decision.outcome === 'allow');
  }

  async getEffectivePermissions(
    user: SessionUser,
    context: AuthorizationContext,
  ): Promise<Capability[]> {
    if (user.role === 'business') {
      const manifest = await this.getEffectiveAccess(
        context.scopeId || user.id,
      );
      return Object.values(manifest.permissions)
        .filter((permission) => permission.outcome === 'allow')
        .map((permission) => permission.key)
        .filter(isPermissionKey)
        .sort();
    }
    return [];
  }

  async getEffectiveAccess(
    businessId: string,
  ): Promise<EffectiveAccessManifest> {
    const policy = await this.getBusinessPolicy(businessId);
    const permissions: Record<string, EffectivePermission> = {};
    for (const definition of PERMISSION_CATALOG) {
      if (!definition.key.startsWith('business:')) continue;
      const rule = policy.permissions[definition.key];
      permissions[definition.key] = rule
        ? {
            key: definition.key,
            outcome:
              rule.accessMode === 'direct'
                ? 'allow'
                : rule.accessMode === 'approval'
                  ? 'approval'
                  : 'deny',
            accessMode: rule.accessMode,
            source: rule.source,
            fieldModes: rule.fieldModes,
            resourceScope: rule.resourceScope,
          }
        : {
            key: definition.key,
            outcome: 'deny',
            accessMode: 'deny',
            source: 'plan',
            fieldModes: {},
            resourceScope: { type: 'all' },
            reason: 'Not included in the subscription plan',
          };
    }

    const usage: EffectiveAccessManifest['usage'] = {};
    for (const [key, value] of Object.entries(policy.entitlements)) {
      if (!key.startsWith('limit.') || typeof value !== 'number') continue;
      const used = await this.getQuotaUsage(businessId, key);
      usage[key] = {
        limit: value,
        used,
        remaining: value === -1 ? -1 : Math.max(0, value - used),
      };
    }

    return {
      subscription: {
        id: policy.subscription.subscription_id,
        status: policy.subscription.subscription_status,
        planId: policy.subscription.plan_id,
        planCode: policy.subscription.plan_code,
        planName: policy.subscription.plan_name,
        currentPeriodEnd: this.iso(policy.subscription.current_period_end),
      },
      navigation: {
        dashboard: this.visible(permissions['business:dashboard:view']),
        linktrees: this.visible(permissions['business:pages:linktrees-access']),
        templates: this.visible(permissions['business:pages:templates-access']),
        analytics: this.visible(permissions['business:analytics:totals-read']),
        profile: this.visible(permissions['business:pages:profile-access']),
        settings: this.visible(permissions['business:pages:settings-access']),
      },
      permissions,
      entitlements: policy.entitlements,
      usage,
      templateKeys: policy.templateKeys,
      pendingApprovals: policy.pendingApprovals,
    };
  }

  async invalidateSubject(subjectType: string, subjectId: string) {
    await this.redis.deleteByPattern(
      `authorization:${subjectType}:${subjectId}:*`,
    );
    if (subjectType === 'business') {
      await this.invalidateBusinessPolicy(subjectId);
    }
  }

  async invalidateBusinessPolicy(businessId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`authorization:business-policy:${businessId}`),
      this.redis.del(`entitlements:business:${businessId}`),
    ]);
  }

  private async authorizeBusiness(
    request: AuthorizationRequest & {
      permission: PermissionKey;
      context: AuthorizationRequest['context'] & { now: Date };
    },
  ): Promise<AuthorizationDecision> {
    const businessId = request.businessId || request.principal.id;
    if (
      request.principal.id !== businessId ||
      (request.resource?.ownerBusinessId &&
        request.resource.ownerBusinessId !== businessId)
    ) {
      return this.deny('TENANT_MISMATCH', 'plan');
    }
    if (!request.permission.startsWith('business:')) {
      return this.deny('NO_PERMISSION', 'plan');
    }

    const policy = await this.getBusinessPolicy(businessId);
    if (policy.subscription.business_status !== 'active') {
      return this.deny('BUSINESS_SUSPENDED', 'plan');
    }
    if (
      !ACTIVE_SUBSCRIPTION_STATUSES.has(
        policy.subscription.subscription_status,
      ) ||
      (policy.subscription.current_period_end &&
        new Date(policy.subscription.current_period_end) <= request.context.now)
    ) {
      return this.deny('SUBSCRIPTION_INACTIVE', 'plan');
    }
    if (await this.hasEmergencyDeny(request)) {
      return this.deny('PLATFORM_DENY', 'plan');
    }

    const rule = policy.permissions[request.permission];
    if (!rule || rule.accessMode === 'deny') {
      return this.deny('NO_PERMISSION', rule?.source || 'plan');
    }
    if (!this.conditionsPass(rule.conditions, request.context)) {
      return this.deny('NO_PERMISSION', rule.source);
    }
    if (!this.resourceInScope(rule.resourceScope, request.resource)) {
      return this.deny('RESOURCE_OUT_OF_SCOPE', rule.source);
    }

    const definition = PERMISSION_BY_KEY.get(request.permission);
    const changedFields = [...new Set(request.changedFields || [])];
    const knownFields = new Set(Object.keys(definition?.fields || {}));
    const unknownFields = changedFields.filter(
      (field) => !knownFields.has(field),
    );
    if (changedFields.length && unknownFields.length) {
      return this.deny('FIELD_DENIED', rule.source, {
        deniedFields: unknownFields,
      });
    }

    const deniedFields = changedFields.filter(
      (field) => (rule.fieldModes[field] || rule.accessMode) === 'deny',
    );
    if (deniedFields.length) {
      return this.deny('FIELD_DENIED', rule.source, {
        deniedFields,
      });
    }
    const approvalFields = changedFields.filter(
      (field) => (rule.fieldModes[field] || rule.accessMode) === 'approval',
    );
    const approvalRequired =
      rule.accessMode === 'approval' || approvalFields.length > 0;

    if (definition?.requiredEntitlement) {
      const value = policy.entitlements[definition.requiredEntitlement];
      if (value !== true) {
        return this.deny('FEATURE_NOT_INCLUDED', rule.source, {
          deniedFields,
          approvalFields,
        });
      }
    }

    let quota: AuthorizationDecision['quota'];
    if (definition?.quotaKey) {
      const value = policy.entitlements[definition.quotaKey];
      const limit =
        typeof value === 'number' && Number.isSafeInteger(value) ? value : 0;
      const used = await this.getQuotaUsage(businessId, definition.quotaKey);
      quota = {
        key: definition.quotaKey,
        limit,
        used,
        remaining: limit === -1 ? -1 : Math.max(0, limit - used),
      };
      if (limit !== -1 && used >= limit) {
        return this.deny('QUOTA_EXCEEDED', rule.source, {
          quota,
        });
      }
    }

    if (approvalRequired) {
      return {
        outcome: 'approval',
        reasonCode: 'APPROVAL_REQUIRED',
        deniedFields: [],
        approvalFields:
          approvalFields.length > 0 ? approvalFields : changedFields,
        source: rule.source,
        quota,
      };
    }
    return {
      outcome: 'allow',
      reasonCode: 'GRANTED',
      deniedFields: [],
      approvalFields: [],
      source: rule.source,
      quota,
    };
  }

  private async getBusinessPolicy(businessId: string): Promise<BusinessPolicy> {
    const cacheKey = `authorization:business-policy:${businessId}`;
    const cached = await this.redis.get<BusinessPolicy>(cacheKey);
    if (cached) return cached;

    const subscriptionResult = await this.database.query<SubscriptionRow>(
      `SELECT b.status AS business_status,
              s.id::text AS subscription_id,
              s.status AS subscription_status,
              subscription_plan.id::text AS plan_id,
              subscription_plan.code AS plan_code,
              subscription_plan.name AS plan_name,
              configuration.id::text AS plan_configuration_id,
              s.current_period_end
       FROM businesses b
       JOIN business_subscriptions s ON s.business_id = b.id
       JOIN billing_subscription_plans subscription_plan
         ON subscription_plan.id = s.subscription_plan_id
       JOIN billing_plan_configurations configuration
         ON configuration.id = s.plan_configuration_id
       WHERE b.id = $1::uuid`,
      [businessId],
    );
    const subscription = subscriptionResult.rows[0];
    if (!subscription) {
      return {
        subscription: {
          business_status: 'inactive',
          subscription_id: '',
          subscription_status: 'expired',
          plan_id: '',
          plan_code: '',
          plan_name: '',
          plan_configuration_id: '',
          current_period_end: null,
        },
        permissions: {},
        entitlements: {},
        templateKeys: [],
        pendingApprovals: [],
      };
    }

    const [
      permissionResult,
      entitlementResult,
      templateResult,
      approvalResult,
    ] = await Promise.all([
      this.database.query<PermissionPolicyRow>(
        `SELECT p.permission_key, p.field_schema,
                  rule.access_mode AS plan_access_mode,
                  rule.field_modes AS plan_field_modes,
                  rule.resource_scope AS plan_resource_scope,
                  rule.conditions AS plan_conditions
           FROM auth_permissions p
           LEFT JOIN billing_plan_permissions rule
             ON rule.plan_configuration_id = $1::uuid
            AND rule.permission_id = p.id
           WHERE p.permission_key LIKE 'business:%' AND p.status = 'active'`,
        [subscription.plan_configuration_id],
      ),
      this.database.query<{
        entitlement_key: string;
        value_type: 'boolean' | 'integer' | 'string';
        value: boolean | number | string | null;
      }>(
        `SELECT e.entitlement_key, e.value_type, value.value
           FROM billing_entitlements e
           LEFT JOIN billing_plan_entitlements value
             ON value.plan_configuration_id = $1::uuid
            AND value.entitlement_id = e.id
           WHERE e.status = 'active'`,
        [subscription.plan_configuration_id],
      ),
      this.database.query<{ template_key: string }>(
        `SELECT template_key
           FROM billing_plan_templates
           WHERE plan_configuration_id = $1::uuid
           ORDER BY template_key`,
        [subscription.plan_configuration_id],
      ),
      this.database.query<{
        id: string;
        permission: string;
        status: string;
        requestedAt: Date | string;
      }>(
        `SELECT request.id::text, permission.permission_key AS permission,
                  request.status, request.requested_at AS "requestedAt"
           FROM permission_approval_requests request
           JOIN auth_permissions permission ON permission.id = request.permission_id
           WHERE request.business_id = $1::uuid
             AND request.status = 'pending'
             AND request.expires_at > NOW()
           ORDER BY request.requested_at DESC`,
        [businessId],
      ),
    ]);

    const permissions: Record<string, EffectiveRule> = {};
    for (const row of permissionResult.rows) {
      if (row.plan_access_mode) {
        permissions[row.permission_key] = {
          key: row.permission_key,
          accessMode: row.plan_access_mode,
          fieldModes: row.plan_field_modes || {},
          resourceScope: row.plan_resource_scope || { type: 'all' },
          conditions: row.plan_conditions || {},
          source: 'plan',
        };
      }
    }

    const entitlements = Object.fromEntries(
      entitlementResult.rows.map((row) => [
        row.entitlement_key,
        row.value ??
          (row.value_type === 'boolean'
            ? false
            : row.value_type === 'integer'
              ? 0
              : ''),
      ]),
    ) as Record<string, boolean | number | string>;
    const policy: BusinessPolicy = {
      subscription,
      permissions,
      entitlements,
      templateKeys: templateResult.rows.map((row) => row.template_key),
      pendingApprovals: approvalResult.rows.map((row) => ({
        ...row,
        requestedAt: this.iso(row.requestedAt) || '',
      })),
    };
    await this.redis.set(cacheKey, policy, 60);
    return policy;
  }

  private async hasEmergencyDeny(
    request: AuthorizationRequest & {
      permission: PermissionKey;
      context: AuthorizationRequest['context'] & { now: Date };
    },
  ): Promise<boolean> {
    const result = await this.database.query<{
      conditions: Record<string, unknown>;
    }>(
      `SELECT deny.conditions
       FROM platform_permission_denies deny
       JOIN auth_permissions permission ON permission.id = deny.permission_id
       WHERE permission.permission_key = $1
         AND (deny.business_id IS NULL OR deny.business_id = $2::uuid)
         AND (deny.resource_type IS NULL OR deny.resource_type = $3)
         AND (deny.resource_id IS NULL OR deny.resource_id = $4::uuid)
         AND (deny.expires_at IS NULL OR deny.expires_at > $5::timestamptz)`,
      [
        request.permission,
        request.businessId || null,
        request.resource?.type || null,
        request.resource?.id || null,
        request.context.now.toISOString(),
      ],
    );
    return result.rows.some((row) =>
      this.conditionsPass(row.conditions || {}, request.context),
    );
  }

  private async getQuotaUsage(
    businessId: string,
    entitlementKey: string,
  ): Promise<number> {
    if (entitlementKey === 'limit.linktrees') {
      const result = await this.database.query<{ used: number }>(
        `SELECT (
           (SELECT COUNT(*) FROM linktrees
            WHERE business_id = $1::uuid AND status <> 'deleted')
           +
           (SELECT COUNT(*) FROM mini_websites
            WHERE business_id = $1::uuid AND status <> 'archived')
         )::int AS used`,
        [businessId],
      );
      return Number(result.rows[0]?.used || 0);
    }
    if (entitlementKey === 'limit.tiktok_pixels') {
      const result = await this.database.query<{ used: number }>(
        `SELECT COUNT(*)::int AS used FROM business_tiktok_pixels
         WHERE business_id = $1::uuid AND status = 'active'`,
        [businessId],
      );
      return Number(result.rows[0]?.used || 0);
    }
    const result = await this.database.query<{ used: number | string }>(
      `SELECT COALESCE(SUM(used), 0)::bigint AS used
       FROM billing_usage_counters
       WHERE business_id = $1::uuid
         AND entitlement_key = $2
         AND period_start <= NOW() AND period_end > NOW()`,
      [businessId, entitlementKey],
    );
    return Number(result.rows[0]?.used || 0);
  }

  private resourceInScope(
    scope: Record<string, unknown>,
    resource?: AuthorizationRequest['resource'],
  ): boolean {
    const type = typeof scope.type === 'string' ? scope.type : 'all';
    if (type === 'all') return true;
    if (type !== 'selected' || !resource?.id) return false;
    if (
      typeof scope.resourceType === 'string' &&
      scope.resourceType !== resource.type
    ) {
      return false;
    }
    return (
      Array.isArray(scope.ids) &&
      scope.ids.some((id) => typeof id === 'string' && id === resource.id)
    );
  }

  private conditionsPass(
    conditions: Record<string, unknown>,
    context: { ipAddress?: string; now: Date },
  ): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    const validAfter = this.asDate(conditions.validAfter);
    const validBefore = this.asDate(conditions.validBefore);
    if (validAfter && context.now < validAfter) return false;
    if (validBefore && context.now >= validBefore) return false;
    const allowedIps = Array.isArray(conditions.allowedIpAddresses)
      ? conditions.allowedIpAddresses.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    return (
      !allowedIps.length ||
      (!!context.ipAddress && allowedIps.includes(context.ipAddress))
    );
  }

  private asDate(value: unknown): Date | null {
    if (typeof value !== 'string') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private visible(permission: EffectivePermission | undefined): boolean {
    return !!permission;
  }

  private iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private allow(
    source: AuthorizationDecision['source'],
  ): AuthorizationDecision {
    return {
      outcome: 'allow',
      reasonCode: 'GRANTED',
      deniedFields: [],
      approvalFields: [],
      source,
    };
  }

  private deny(
    reasonCode: AuthorizationDecision['reasonCode'],
    source: AuthorizationDecision['source'],
    extras: Partial<AuthorizationDecision> = {},
  ): AuthorizationDecision {
    return {
      outcome: 'deny',
      reasonCode,
      deniedFields: [],
      approvalFields: [],
      source,
      ...extras,
    };
  }
}
