import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { AdvertisingService } from '../advertising/advertising.service';
import { describeError } from '../common/describe-error';
import { DatabaseService } from '../database/database.service';
import { PUBLIC_PLANS_CACHE_KEY } from '../common/public-catalog-cache';
import { RedisService } from '../redis/redis.service';
import type {
  CreateEntitlementDto,
  CreatePlanDto,
  CreateSubscriptionPlanDto,
  UpdateEntitlementDto,
  UpdatePermissionProfileDto,
  UpdatePlanDto,
  UpdatePlanConfigurationDto,
  UpdateSubscriptionPlanDto,
  UpsertBusinessSubscriptionDto,
} from './dto/billing-management.dto';
import { getDefaultTemplateKeys } from '../billing/plan-template-tiers';
import { pageMetadata } from '../common/dto/admin-list-query.dto';
import type { BillingOverviewQueryDto } from './dto/billing-overview-query.dto';
import { BillingRepository } from './billing.repository';

interface EntitlementRow {
  id: string;
  key: string;
  valueType: 'boolean' | 'integer' | 'string';
}

interface PermissionRow {
  id: string;
  key: string;
  fieldSchema: Record<string, string>;
  supportsApproval: boolean;
}

const DEFAULT_BUSINESS_PERMISSION_KEYS = [
  'business:dashboard:view',
  'business:pages:linktrees-access',
  'business:pages:templates-access',
  'business:pages:profile-access',
  'business:pages:settings-access',
  'business:settings:profile-access',
  'business:settings:defaults-access',
  'business:settings:security-access',
  'business:profile:read',
  'business:defaults:read',
  'business:defaults:update',
  'business:security:email-update',
  'business:security:username-update',
  'business:security:sessions-revoke',
  'business:templates:browse',
  'business:templates:use',
  'business:templates:set-default',
  'business:linktrees:read',
  'business:linktrees:create',
  'business:linktrees:update',
  'business:linktrees:delete',
  'business:linktrees:upload',
  'business:links:read',
  'business:links:create',
  'business:links:update',
  'business:links:delete',
  'business:links:sync',
  'business:links:reorder',
  'business:analytics:totals-read',
  'business:analytics:details-read',
] as const;

@Injectable()
export class BillingManagementService {
  private readonly logger = new Logger(BillingManagementService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
    private readonly repository: BillingRepository = new BillingRepository(
      database,
    ),
    // Required, not optional: an unresolved provider here would turn the
    // plan-change cache invalidation into a silent no-op, which is the failure
    // this dependency exists to prevent.
    private readonly advertising: AdvertisingService,
  ) {}

  async getOverview(query: BillingOverviewQueryDto) {
    const search = query.search?.trim() || '';
    const offset = (query.page - 1) * query.limit;
    const [entitlements, plans, permissionProfiles, businessRows, summary] =
      await Promise.all([
        this.database.query(
          `SELECT id::text, entitlement_key AS key, name, description,
                  value_type AS "valueType", unit, category, status,
                  created_at AS "createdAt", updated_at AS "updatedAt"
           FROM billing_entitlements
           ORDER BY category, name`,
        ),
        this.database.query(
          `SELECT subscription_plan.id::text,
                  subscription_plan.code,
                  subscription_plan.name,
                  subscription_plan.description,
                  subscription_plan.permission_profile_id::text
                    AS "permissionProfileId",
                  permission_profile.name AS "permissionProfileName",
                  subscription_plan.status,
                  subscription_plan.currency,
                  subscription_plan.yearly_price_minor
                    AS "yearlyPriceMinor",
                  subscription_plan.trial_days AS "trialDays",
                  subscription_plan.display_order AS "displayOrder",
                  subscription_plan.is_default AS "isDefault",
                  subscription_plan.created_at AS "createdAt",
                  subscription_plan.updated_at AS "updatedAt",
                  COUNT(DISTINCT subscription.id)::int AS "subscriberCount"
           FROM billing_subscription_plans subscription_plan
           JOIN billing_plans permission_profile
             ON permission_profile.id =
                subscription_plan.permission_profile_id
           LEFT JOIN business_subscriptions subscription
             ON subscription.subscription_plan_id = subscription_plan.id
            AND subscription.status IN
                ('trialing','active','past_due','grace_period')
           GROUP BY subscription_plan.id, permission_profile.id
           ORDER BY subscription_plan.display_order, subscription_plan.name`,
        ),
        this.database.query(
          `SELECT permission_profile.id::text,
                  permission_profile.code,
                  permission_profile.name,
                  configuration.id::text AS "configurationId",
                  COUNT(DISTINCT permission.permission_id)::int
                    AS "permissionCount"
           FROM billing_plans permission_profile
           JOIN billing_plan_configurations configuration
             ON configuration.plan_id = permission_profile.id
           LEFT JOIN billing_plan_permissions permission
             ON permission.plan_configuration_id = configuration.id
           WHERE permission_profile.status = 'active'
           GROUP BY permission_profile.id, configuration.id
           ORDER BY permission_profile.display_order,
                    permission_profile.name`,
        ),
        this.database.query<
          Record<string, unknown> & {
            businessId: string;
            businessName: string;
            username: string;
            businessStatus: string;
            id: string | null;
            total: string;
          }
        >(
          `SELECT business.id::text AS "businessId",
                  business.name AS "businessName",
                  business.username,
                  business.status AS "businessStatus",
                  subscription.id::text,
                  subscription.subscription_plan_id::text AS "planId",
                  subscription.plan_name AS "planName",
                  subscription.plan_id::text AS "permissionProfileId",
                  subscription.permission_profile_name AS "permissionProfileName",
                  subscription.status,
                  subscription.starts_at AS "startsAt",
                  subscription.current_period_start AS "currentPeriodStart",
                  subscription.current_period_end AS "currentPeriodEnd",
                  subscription.updated_at AS "updatedAt",
                  COUNT(*) OVER()::text AS total
           FROM businesses business
           LEFT JOIN LATERAL (
             SELECT current_subscription.*,
                    subscription_plan.name AS plan_name,
                    permission_profile.name AS permission_profile_name
             FROM business_subscriptions current_subscription
             JOIN billing_subscription_plans subscription_plan
               ON subscription_plan.id=current_subscription.subscription_plan_id
             JOIN billing_plans permission_profile
               ON permission_profile.id=current_subscription.plan_id
             WHERE current_subscription.business_id=business.id
             ORDER BY current_subscription.created_at DESC LIMIT 1
           ) subscription ON true
           WHERE business.account_type = 'business'
             AND ($1='' OR business.name ILIKE $1 OR business.username ILIKE $1
                    OR subscription.plan_name ILIKE $1)
             AND ($2::text IS NULL
               OR ($2='unassigned' AND subscription.id IS NULL)
               OR subscription.status=$2)
             AND ($3::uuid IS NULL OR subscription.subscription_plan_id=$3)
           ORDER BY business.name LIMIT $4 OFFSET $5`,
          [
            `%${search}%`,
            query.status || null,
            query.planId || null,
            query.limit,
            offset,
          ],
        ),
        this.database.query<{
          activeSubscriptions: number;
          attentionRequired: number;
        }>(
          `SELECT
             COUNT(*) FILTER (WHERE status IN ('trialing','active','grace_period'))::int AS "activeSubscriptions",
             COUNT(*) FILTER (WHERE status IN ('past_due','incomplete','expired'))::int AS "attentionRequired"
           FROM business_subscriptions`,
        ),
      ]);
    const planRows = plans.rows as Array<{ status: string }>;
    const subscriptions = businessRows.rows.filter((row) => row.id);
    const businesses = businessRows.rows.map((row) => ({
      id: row.businessId,
      name: row.businessName,
      username: row.username,
      status: row.businessStatus,
    }));
    const total = Number(businessRows.rows[0]?.total || 0);
    return {
      entitlements: entitlements.rows,
      plans: plans.rows,
      permissionProfiles: permissionProfiles.rows,
      subscriptions,
      businesses,
      pagination: pageMetadata(query.page, query.limit, total),
      summary: {
        activePlans: planRows.filter((row) => row.status === 'active').length,
        activeSubscriptions: summary.rows[0]?.activeSubscriptions || 0,
        attentionRequired: summary.rows[0]?.attentionRequired || 0,
      },
    };
  }

  async getPermissionCatalog() {
    return this.repository.permissionCatalog();
  }

  async createEntitlement(dto: CreateEntitlementDto) {
    try {
      const result = await this.database.query<{ id: string }>(
        `INSERT INTO billing_entitlements
          (entitlement_key, name, description, value_type, unit, category)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text`,
        [
          dto.key,
          dto.name.trim(),
          dto.description?.trim() || '',
          dto.valueType,
          dto.unit?.trim() || null,
          dto.category?.trim() || 'general',
        ],
      );
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Entitlement key already exists');
      }
      throw error;
    }
  }

  async updateEntitlement(id: string, dto: UpdateEntitlementDto) {
    const result = await this.database.query(
      `UPDATE billing_entitlements SET
         name = COALESCE($2, name), description = COALESCE($3, description),
         unit = CASE WHEN $4::boolean THEN $5 ELSE unit END,
         category = COALESCE($6, category), status = COALESCE($7, status)
       WHERE id = $1::uuid RETURNING id::text`,
      [
        id,
        dto.name?.trim() || null,
        dto.description?.trim() ?? null,
        dto.unit !== undefined,
        dto.unit?.trim() || null,
        dto.category?.trim() || null,
        dto.status || null,
      ],
    );
    if (!result.rowCount) throw new NotFoundException('Entitlement not found');
    await this.invalidateEntitlementUsers(id);
    return result.rows[0];
  }

  async createPlan(dto: CreatePlanDto, actorId: string) {
    const created = await this.database
      .transaction(async (client) => {
        const planName = dto.name.trim();
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
          [`billing-plan-name:${planName.toLocaleLowerCase()}`],
        );
        const duplicateName = await client.query(
          `SELECT 1
           FROM billing_plans
           WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1))
           LIMIT 1`,
          [planName],
        );
        if (duplicateName.rowCount) {
          throw new ConflictException(
            'Permission profile name already exists. Use a different name, such as adding 1.',
          );
        }
        const planCode = await this.resolveUniquePlanCode(
          client,
          planName,
          dto.code,
        );
        if (dto.isDefault)
          await client.query(
            `UPDATE billing_plans SET is_default = FALSE WHERE is_default = TRUE`,
          );
        const plan = await client.query<{ id: string }>(
          `INSERT INTO billing_plans
           (code, name, description, status, currency,
           yearly_price_minor, trial_days, display_order, is_default, created_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::uuid) RETURNING id::text`,
          [
            planCode,
            planName,
            dto.description?.trim() || '',
            dto.status || 'active',
            dto.currency,
            dto.yearlyPriceMinor,
            dto.trialDays || 0,
            dto.displayOrder || 0,
            dto.isDefault || false,
            actorId,
          ],
        );
        const configuration = await client.query<{ id: string }>(
          `INSERT INTO billing_plan_configurations(plan_id)
           VALUES ($1::uuid) RETURNING id::text`,
          [plan.rows[0].id],
        );
        const selectedPermissions = await this.resolveCreatePlanPermissions(
          client,
          dto.permissionIds || [],
        );
        await this.replacePlanPermissions(
          client,
          configuration.rows[0].id,
          Object.fromEntries(
            selectedPermissions.map((item) => [
              item.id,
              {
                accessMode: 'direct',
                fieldModes: {},
                resourceScope: { type: 'all' },
                conditions: {},
              },
            ]),
          ),
        );
        await this.seedNewPlanEntitlements(
          client,
          configuration.rows[0].id,
          planCode,
          new Set(selectedPermissions.map((item) => item.key)),
          dto.entitlements || {},
        );
        for (const templateKey of getDefaultTemplateKeys(planCode)) {
          await client.query(
            `INSERT INTO billing_plan_templates
               (plan_configuration_id,template_key)
             VALUES ($1::uuid,$2)`,
            [configuration.rows[0].id, templateKey],
          );
        }
        return {
          ...plan.rows[0],
          configurationId: configuration.rows[0].id,
        };
      })
      .catch((error) => {
        const databaseError = error as { code?: string; constraint?: string };
        if (
          databaseError.code === '23505' &&
          databaseError.constraint === 'uq_billing_plans_name_ci'
        ) {
          throw new ConflictException(
            'Permission profile name already exists. Use a different name, such as adding 1.',
          );
        }
        if (databaseError.code === '23505')
          throw new ConflictException('Plan code already exists');
        throw error;
      });
    await this.invalidatePublicPlans();
    return created;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const updated = await this.database.transaction(async (client) => {
      const exists = await client.query(
        `SELECT 1 FROM billing_plans WHERE id = $1::uuid FOR UPDATE`,
        [id],
      );
      if (!exists.rowCount) throw new NotFoundException('Plan not found');
      if (dto.isDefault)
        await client.query(
          `UPDATE billing_plans SET is_default = FALSE WHERE id <> $1::uuid`,
          [id],
        );
      await client.query(
        `UPDATE billing_plans SET name=COALESCE($2,name), description=COALESCE($3,description),
          status=COALESCE($4,status), currency=COALESCE($5,currency),
          yearly_price_minor=COALESCE($6,yearly_price_minor),
          trial_days=COALESCE($7,trial_days), display_order=COALESCE($8,display_order),
          is_default=COALESCE($9,is_default) WHERE id=$1::uuid`,
        [
          id,
          dto.name?.trim() || null,
          dto.description?.trim() ?? null,
          dto.status || null,
          dto.currency || null,
          dto.yearlyPriceMinor ?? null,
          dto.trialDays ?? null,
          dto.displayOrder ?? null,
          dto.isDefault ?? null,
        ],
      );
      if (dto.entitlements) {
        const configurationId = await this.getPlanConfigurationId(client, id);
        await this.replacePlanEntitlements(
          client,
          configurationId,
          dto.entitlements,
        );
      }
      return { id };
    });
    await this.invalidatePlanBusinesses(id);
    // A permission profile is the configuration a subscription plan points at,
    // and the public list reads that plan's entitlements through it.
    await this.invalidatePublicPlans();
    return updated;
  }

  async updatePermissionProfile(id: string, dto: UpdatePermissionProfileDto) {
    const result = await this.database
      .transaction(async (client) => {
        const profile = await client.query<{ id: string }>(
          `SELECT id::text
           FROM billing_plans
           WHERE id = $1::uuid
           FOR UPDATE`,
          [id],
        );
        if (!profile.rowCount) {
          throw new NotFoundException('Permission profile not found');
        }

        const profileName = dto.name.trim();
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
          [`billing-plan-name:${profileName.toLocaleLowerCase()}`],
        );
        const duplicateName = await client.query(
          `SELECT 1
           FROM billing_plans
           WHERE id <> $1::uuid
             AND LOWER(BTRIM(name)) = LOWER(BTRIM($2))
           LIMIT 1`,
          [id, profileName],
        );
        if (duplicateName.rowCount) {
          throw new ConflictException(
            'Permission profile name already exists. Use a different name, such as adding 1.',
          );
        }

        const selectedPermissions = await this.resolveCreatePlanPermissions(
          client,
          dto.permissionIds,
        );
        const configurationId = await this.getPlanConfigurationId(client, id);
        await client.query(
          `UPDATE billing_plans
           SET name = $2
           WHERE id = $1::uuid`,
          [id, profileName],
        );
        await this.replacePlanPermissions(
          client,
          configurationId,
          Object.fromEntries(
            selectedPermissions.map((item) => [
              item.id,
              {
                accessMode: 'direct',
                fieldModes: {},
                resourceScope: { type: 'all' },
                conditions: {},
              },
            ]),
          ),
        );
        return {
          id,
          name: profileName,
          permissionCount: selectedPermissions.length,
        };
      })
      .catch((error) => {
        const databaseError = error as { code?: string; constraint?: string };
        if (
          databaseError.code === '23505' &&
          databaseError.constraint === 'uq_billing_plans_name_ci'
        ) {
          throw new ConflictException(
            'Permission profile name already exists. Use a different name, such as adding 1.',
          );
        }
        throw error;
      });
    await this.invalidatePlanBusinesses(id);
    return result;
  }

  async deletePermissionProfile(id: string) {
    return this.database
      .transaction(async (client) => {
        const profile = await client.query<{
          id: string;
          name: string;
          isDefault: boolean;
        }>(
          `SELECT id::text, name, is_default AS "isDefault"
           FROM billing_plans
           WHERE id = $1::uuid
           FOR UPDATE`,
          [id],
        );
        if (!profile.rowCount) {
          throw new NotFoundException('Permission profile not found');
        }
        if (profile.rows[0].isDefault) {
          throw new ConflictException(
            'The default permission profile cannot be deleted',
          );
        }

        const assignments = await client.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count
           FROM business_subscriptions
           WHERE plan_id = $1::uuid`,
          [id],
        );
        if ((assignments.rows[0]?.count || 0) > 0) {
          throw new ConflictException(
            'Permission profile is assigned to one or more businesses',
          );
        }

        await client.query(`DELETE FROM billing_plans WHERE id = $1::uuid`, [
          id,
        ]);
        return { id, name: profile.rows[0].name };
      })
      .catch((error) => {
        if ((error as { code?: string }).code === '23503') {
          throw new ConflictException(
            'Permission profile is still referenced and cannot be deleted',
          );
        }
        throw error;
      });
  }

  async createSubscriptionPlan(
    dto: CreateSubscriptionPlanDto,
    actorId: string,
  ) {
    const created = await this.database
      .transaction(async (client) => {
        const name = dto.name.trim();
        const status = dto.status || 'active';
        if (dto.isDefault && status !== 'active') {
          throw new BadRequestException(
            'The default subscription plan must be active',
          );
        }
        await this.assertPermissionProfile(client, dto.permissionProfileId);
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
          [`billing-subscription-plan-name:${name.toLocaleLowerCase()}`],
        );
        const duplicate = await client.query(
          `SELECT 1
           FROM billing_subscription_plans
           WHERE LOWER(BTRIM(name)) = LOWER(BTRIM($1))
           LIMIT 1`,
          [name],
        );
        if (duplicate.rowCount) {
          throw new ConflictException(
            'Subscription plan name already exists. Use a different name.',
          );
        }
        const code = await this.resolveUniqueSubscriptionPlanCode(
          client,
          name,
          dto.code,
        );
        if (dto.isDefault) {
          await client.query(
            `UPDATE billing_subscription_plans
             SET is_default = FALSE
             WHERE is_default = TRUE`,
          );
        }
        const result = await client.query<{ id: string }>(
          `INSERT INTO billing_subscription_plans
              (code, name, description, permission_profile_id, status,
               currency, yearly_price_minor, trial_days,
               display_order, is_default, created_by)
            VALUES
              ($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11::uuid)
            RETURNING id::text`,
          [
            code,
            name,
            dto.description?.trim() || '',
            dto.permissionProfileId,
            status,
            dto.currency,
            dto.yearlyPriceMinor,
            dto.trialDays || 0,
            dto.displayOrder || 0,
            dto.isDefault || false,
            actorId,
          ],
        );
        return result.rows[0];
      })
      .catch((error) => this.translateSubscriptionPlanConflict(error));
    await this.invalidatePublicPlans();
    return created;
  }

  async updateSubscriptionPlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const result = await this.database
      .transaction(async (client) => {
        const current = await client.query<{
          name: string;
          status: 'active' | 'inactive' | 'archived';
          isDefault: boolean;
          permissionProfileId: string;
        }>(
          `SELECT name, status, is_default AS "isDefault",
                  permission_profile_id::text AS "permissionProfileId"
           FROM billing_subscription_plans
           WHERE id = $1::uuid
           FOR UPDATE`,
          [id],
        );
        if (!current.rowCount) {
          throw new NotFoundException('Subscription plan not found');
        }
        const existing = current.rows[0];
        const nextName = dto.name?.trim() || existing.name;
        const nextStatus = dto.status || existing.status;
        const nextIsDefault = dto.isDefault ?? existing.isDefault;
        const nextProfile =
          dto.permissionProfileId || existing.permissionProfileId;
        if (existing.isDefault && dto.isDefault === false) {
          throw new BadRequestException(
            'Assign another default subscription plan before removing this default',
          );
        }
        if (nextIsDefault && nextStatus !== 'active') {
          throw new BadRequestException(
            'The default subscription plan must be active',
          );
        }
        await this.assertPermissionProfile(client, nextProfile);
        await client.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
          [`billing-subscription-plan-name:${nextName.toLocaleLowerCase()}`],
        );
        const duplicate = await client.query(
          `SELECT 1
           FROM billing_subscription_plans
           WHERE id <> $1::uuid
             AND LOWER(BTRIM(name)) = LOWER(BTRIM($2))
           LIMIT 1`,
          [id, nextName],
        );
        if (duplicate.rowCount) {
          throw new ConflictException(
            'Subscription plan name already exists. Use a different name.',
          );
        }
        if (dto.isDefault) {
          await client.query(
            `UPDATE billing_subscription_plans
             SET is_default = FALSE
             WHERE id <> $1::uuid AND is_default = TRUE`,
            [id],
          );
        }
        await client.query(
          `UPDATE billing_subscription_plans
           SET name = $2,
               description = COALESCE($3, description),
               permission_profile_id = $4::uuid,
               status = $5,
                currency = COALESCE($6, currency),
                yearly_price_minor =
                  COALESCE($7, yearly_price_minor),
                trial_days = COALESCE($8, trial_days),
                display_order = COALESCE($9, display_order),
                is_default = $10
            WHERE id = $1::uuid`,
          [
            id,
            nextName,
            dto.description?.trim() ?? null,
            nextProfile,
            nextStatus,
            dto.currency || null,
            dto.yearlyPriceMinor ?? null,
            dto.trialDays ?? null,
            dto.displayOrder ?? null,
            nextIsDefault,
          ],
        );
        if (nextProfile !== existing.permissionProfileId) {
          const configurationId = await this.getPlanConfigurationId(
            client,
            nextProfile,
          );
          await client.query(
            `UPDATE business_subscriptions
             SET plan_id = $2::uuid,
                 plan_configuration_id = $3::uuid
             WHERE subscription_plan_id = $1::uuid`,
            [id, nextProfile, configurationId],
          );
        }
        return { id };
      })
      .catch((error) => this.translateSubscriptionPlanConflict(error));
    await this.invalidateSubscriptionPlanBusinesses(id);
    await this.invalidatePublicPlans();
    return result;
  }

  async deleteSubscriptionPlan(id: string) {
    const deleted = await this.database.transaction(async (client) => {
      const plan = await client.query<{
        id: string;
        name: string;
        isDefault: boolean;
      }>(
        `SELECT id::text, name, is_default AS "isDefault"
         FROM billing_subscription_plans
         WHERE id = $1::uuid
         FOR UPDATE`,
        [id],
      );
      if (!plan.rowCount) {
        throw new NotFoundException('Subscription plan not found');
      }
      if (plan.rows[0].isDefault) {
        throw new ConflictException(
          'The default subscription plan cannot be deleted',
        );
      }
      const assignments = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count
         FROM business_subscriptions
         WHERE subscription_plan_id = $1::uuid`,
        [id],
      );
      if ((assignments.rows[0]?.count || 0) > 0) {
        throw new ConflictException(
          'Subscription plan is assigned to one or more businesses',
        );
      }
      await client.query(
        `DELETE FROM billing_subscription_plans WHERE id = $1::uuid`,
        [id],
      );
      return { id, name: plan.rows[0].name };
    });
    await this.invalidatePublicPlans();
    return deleted;
  }

  async upsertSubscription(
    dto: UpsertBusinessSubscriptionDto,
    actorId: string,
  ) {
    const assignment = await this.resolveSubscriptionAssignment(
      dto.subscriptionPlanId,
      dto.planId,
      dto.businessId,
    );
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO business_subscriptions
        (business_id, subscription_plan_id, plan_id, plan_configuration_id,
         status, current_period_start, current_period_end,
         created_by)
       VALUES
        ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,
         COALESCE($6::timestamptz,NOW()),$7::timestamptz,
         $8::uuid)
       ON CONFLICT (business_id) DO UPDATE SET
         subscription_plan_id=EXCLUDED.subscription_plan_id,
         plan_id=EXCLUDED.plan_id,
         plan_configuration_id=EXCLUDED.plan_configuration_id,
         status=EXCLUDED.status,
         current_period_start=EXCLUDED.current_period_start,
         current_period_end=EXCLUDED.current_period_end,
         ended_at=CASE WHEN EXCLUDED.status IN ('canceled','expired') THEN NOW() ELSE NULL END
       RETURNING id::text`,
      [
        dto.businessId,
        assignment.subscriptionPlanId,
        assignment.permissionProfileId,
        assignment.configurationId,
        dto.status,
        dto.currentPeriodStart || null,
        dto.currentPeriodEnd || null,
        actorId,
      ],
    );
    await this.invalidateBusiness(dto.businessId);
    return result.rows[0];
  }

  async getPlanConfiguration(planId: string) {
    const configuration = await this.database.query(
      `SELECT configuration.id::text,
              configuration.plan_id::text AS "planId",
              COUNT(DISTINCT subscription.id)::int AS "subscriberCount",
              COALESCE(jsonb_object_agg(
                permission.permission_id::text,
                jsonb_build_object(
                  'accessMode', permission.access_mode,
                  'fieldModes', permission.field_modes,
                  'resourceScope', permission.resource_scope,
                  'conditions', permission.conditions
                )
              ) FILTER (WHERE permission.permission_id IS NOT NULL), '{}'::jsonb) AS permissions,
              COALESCE(jsonb_object_agg(
                entitlement.entitlement_id::text, entitlement.value
              ) FILTER (WHERE entitlement.entitlement_id IS NOT NULL), '{}'::jsonb) AS entitlements,
              COALESCE(array_agg(DISTINCT template.template_key)
                FILTER (WHERE template.template_key IS NOT NULL), '{}') AS "templateKeys"
       FROM billing_plan_configurations configuration
       LEFT JOIN business_subscriptions subscription
         ON subscription.plan_configuration_id = configuration.id
       LEFT JOIN billing_plan_permissions permission
         ON permission.plan_configuration_id = configuration.id
       LEFT JOIN billing_plan_entitlements entitlement
         ON entitlement.plan_configuration_id = configuration.id
       LEFT JOIN billing_plan_templates template
         ON template.plan_configuration_id = configuration.id
       WHERE configuration.plan_id = $1::uuid
       GROUP BY configuration.id`,
      [planId],
    );
    if (!configuration.rows[0]) {
      throw new NotFoundException('Plan configuration not found');
    }
    return configuration.rows[0];
  }

  private async resolveUniquePlanCode(
    client: PoolClient,
    name: string,
    requestedCode?: string,
  ): Promise<string> {
    let base = (requestedCode?.trim() || name)
      .normalize('NFKD')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!base || !/^[a-z]/.test(base)) {
      base = base ? `profile-${base}` : 'profile';
    }
    base = base.slice(0, 50).replace(/-+$/g, '') || 'profile';

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`billing-plan-code:${base}`],
    );
    const existing = await client.query<{ code: string }>(
      `SELECT code
       FROM billing_plans
       WHERE code = $1 OR code LIKE $2`,
      [base, `${base}-%`],
    );
    const usedCodes = new Set(existing.rows.map((row) => row.code));
    if (!usedCodes.has(base)) return base;

    let suffix = 1;
    while (usedCodes.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  private async resolveUniqueSubscriptionPlanCode(
    client: PoolClient,
    name: string,
    requestedCode?: string,
  ): Promise<string> {
    let base = (requestedCode?.trim() || name)
      .normalize('NFKD')
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!base || !/^[a-z]/.test(base)) {
      base = base ? `plan-${base}` : 'plan';
    }
    base = base.slice(0, 50).replace(/-+$/g, '') || 'plan';

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`billing-subscription-plan-code:${base}`],
    );
    const existing = await client.query<{ code: string }>(
      `SELECT code
       FROM billing_subscription_plans
       WHERE code = $1 OR code LIKE $2`,
      [base, `${base}-%`],
    );
    const usedCodes = new Set(existing.rows.map((row) => row.code));
    if (!usedCodes.has(base)) return base;

    let suffix = 1;
    while (usedCodes.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  private async assertPermissionProfile(
    client: PoolClient,
    permissionProfileId: string,
  ): Promise<void> {
    const profile = await client.query(
      `SELECT 1
       FROM billing_plans permission_profile
       JOIN billing_plan_configurations configuration
         ON configuration.plan_id = permission_profile.id
       WHERE permission_profile.id = $1::uuid
         AND permission_profile.status = 'active'`,
      [permissionProfileId],
    );
    if (!profile.rowCount) {
      throw new BadRequestException(
        'Permission profile does not exist or is inactive',
      );
    }
  }

  private translateSubscriptionPlanConflict(error: unknown): never {
    const databaseError = error as { code?: string; constraint?: string };
    if (
      databaseError.code === '23505' &&
      databaseError.constraint === 'uq_billing_subscription_plans_name_ci'
    ) {
      throw new ConflictException(
        'Subscription plan name already exists. Use a different name.',
      );
    }
    if (
      databaseError.code === '23505' &&
      databaseError.constraint === 'uq_billing_one_default_subscription_plan'
    ) {
      throw new ConflictException(
        'Only one active default subscription plan is allowed',
      );
    }
    if (databaseError.code === '23505') {
      throw new ConflictException('Subscription plan code already exists');
    }
    throw error;
  }

  async updatePlanConfiguration(
    planId: string,
    dto: UpdatePlanConfigurationDto,
  ) {
    const result = await this.database.transaction(async (client) => {
      const configurationId = await this.getPlanConfigurationId(client, planId);
      await this.applyPlanConfiguration(client, configurationId, dto);
      return { id: configurationId, planId };
    });
    await this.invalidatePlanBusinesses(planId);
    await this.invalidatePublicPlans();
    return result;
  }

  private async replacePlanEntitlements(
    client: PoolClient,
    configurationId: string,
    values: Record<string, unknown>,
  ) {
    const ids = Object.keys(values);
    const rows = ids.length
      ? await client.query<EntitlementRow>(
          `SELECT id::text, entitlement_key AS key, value_type AS "valueType"
       FROM billing_entitlements WHERE id = ANY($1::uuid[]) AND status='active'`,
          [ids],
        )
      : { rows: [] as EntitlementRow[], rowCount: 0 };
    if (rows.rowCount !== ids.length)
      throw new BadRequestException(
        'One or more entitlements do not exist or are inactive',
      );
    for (const row of rows.rows) this.assertValue(row, values[row.id]);
    await client.query(
      `DELETE FROM billing_plan_entitlements
       WHERE plan_configuration_id=$1::uuid`,
      [configurationId],
    );
    for (const row of rows.rows) {
      await client.query(
        `INSERT INTO billing_plan_entitlements
           (plan_configuration_id,entitlement_id,value)
         VALUES($1::uuid,$2::uuid,$3::jsonb)`,
        [configurationId, row.id, JSON.stringify(values[row.id])],
      );
    }
  }

  private async resolveCreatePlanPermissions(
    client: PoolClient,
    requestedIds: string[],
  ): Promise<Array<{ id: string; key: string }>> {
    const result = await client.query<{ id: string; key: string }>(
      `SELECT id::text, permission_key AS key
       FROM auth_permissions
       WHERE status='active'
         AND permission_key LIKE 'business:%'
         AND (
           id = ANY($1::uuid[])
           OR permission_key = ANY($2::text[])
         )`,
      [requestedIds, DEFAULT_BUSINESS_PERMISSION_KEYS],
    );
    const foundRequested = new Set(
      result.rows
        .filter((row) => requestedIds.includes(row.id))
        .map((row) => row.id),
    );
    if (foundRequested.size !== requestedIds.length) {
      throw new BadRequestException(
        'One or more selected business permissions are invalid',
      );
    }
    return result.rows;
  }

  private async seedNewPlanEntitlements(
    client: PoolClient,
    configurationId: string,
    planCode: string,
    permissionKeys: Set<string>,
    requestedValues: Record<string, unknown>,
  ): Promise<void> {
    const hasTikTok = [...permissionKeys].some((key) =>
      key.startsWith('business:tiktok:'),
    );
    const hasAdvancedAnalytics =
      permissionKeys.has('business:analytics:advanced-read') ||
      permissionKeys.has('business:analytics:daily-read') ||
      permissionKeys.has('business:analytics:range-read');
    const hasAnalyticsClear =
      permissionKeys.has('business:analytics:clear-linktree') ||
      permissionKeys.has('business:analytics:clear-all');
    const defaults: Record<string, boolean | number> = {
      'feature.profile_editing': permissionKeys.has('business:profile:update'),
      'feature.branding_editing': permissionKeys.has(
        'business:profile-assets:upload',
      ),
      'feature.page_defaults': true,
      'feature.tiktok': hasTikTok,
      'feature.advanced_analytics': hasAdvancedAnalytics,
      'feature.analytics_clear': hasAnalyticsClear,
      'feature.premium_templates': false,
      'feature.remove_branding': false,
      'limit.linktrees': 5,
      'limit.tiktok_pixels':
        hasTikTok && planCode.toLowerCase() === 'ultra'
          ? 3
          : hasTikTok && planCode.toLowerCase() === 'pro'
            ? 2
            : hasTikTok
              ? 1
              : 0,
      'limit.templates': getDefaultTemplateKeys(planCode).length,
      'limit.analytics_range_days': hasAdvancedAnalytics ? 90 : 30,
      'limit.profile_changes_monthly': permissionKeys.has(
        'business:profile:update',
      )
        ? 20
        : 0,
      'retention.analytics_days': hasAdvancedAnalytics ? 365 : 30,
    };
    const entitlements = await client.query<{ id: string; key: string }>(
      `SELECT id::text, entitlement_key AS key
       FROM billing_entitlements
       WHERE entitlement_key = ANY($1::text[]) AND status='active'`,
      [Object.keys(defaults)],
    );
    const values = Object.fromEntries(
      entitlements.rows.map((row) => [
        row.id,
        requestedValues[row.id] ?? defaults[row.key],
      ]),
    );
    await this.replacePlanEntitlements(client, configurationId, values);
  }

  private async getPlanConfigurationId(
    client: PoolClient,
    planId: string,
  ): Promise<string> {
    const configuration = await client.query<{ id: string }>(
      `SELECT id::text FROM billing_plan_configurations
       WHERE plan_id=$1::uuid
       FOR UPDATE`,
      [planId],
    );
    if (!configuration.rows[0]) {
      const plan = await client.query(
        `SELECT 1 FROM billing_plans WHERE id=$1::uuid`,
        [planId],
      );
      if (!plan.rowCount) throw new NotFoundException('Plan not found');
      throw new NotFoundException('Plan configuration not found');
    }
    return configuration.rows[0].id;
  }

  private async resolveSubscriptionAssignment(
    subscriptionPlanId?: string,
    legacyPermissionProfileId?: string,
    businessId?: string,
  ): Promise<{
    subscriptionPlanId: string;
    permissionProfileId: string;
    configurationId: string;
  }> {
    if (!subscriptionPlanId && !legacyPermissionProfileId) {
      throw new BadRequestException('A subscription plan is required');
    }
    const result = await this.database.query<{
      subscriptionPlanId: string;
      permissionProfileId: string;
      configurationId: string;
    }>(
      `SELECT subscription_plan.id::text AS "subscriptionPlanId",
              subscription_plan.permission_profile_id::text
                AS "permissionProfileId",
              configuration.id::text AS "configurationId"
       FROM billing_subscription_plans subscription_plan
       JOIN billing_plan_configurations configuration
         ON configuration.plan_id =
            subscription_plan.permission_profile_id
       WHERE (
          $1::uuid IS NOT NULL
          AND subscription_plan.id = $1::uuid
       ) OR (
          $1::uuid IS NULL
          AND subscription_plan.permission_profile_id = $2::uuid
       )
         AND (
           subscription_plan.status = 'active'
           OR EXISTS (
             SELECT 1
             FROM business_subscriptions current_subscription
             WHERE current_subscription.business_id = $3::uuid
               AND current_subscription.subscription_plan_id =
                   subscription_plan.id
           )
         )
       ORDER BY subscription_plan.is_default DESC,
                subscription_plan.display_order,
                subscription_plan.created_at
       LIMIT 1`,
      [
        subscriptionPlanId || null,
        legacyPermissionProfileId || null,
        businessId || null,
      ],
    );
    if (!result.rows[0]) {
      throw new BadRequestException(
        'Subscription plan or permission profile configuration is invalid',
      );
    }
    return result.rows[0];
  }

  private async applyPlanConfiguration(
    client: PoolClient,
    configurationId: string,
    dto: UpdatePlanConfigurationDto,
  ): Promise<void> {
    if (dto.permissions !== undefined) {
      await this.replacePlanPermissions(
        client,
        configurationId,
        dto.permissions,
      );
    }
    if (dto.entitlements !== undefined) {
      await this.replacePlanEntitlements(
        client,
        configurationId,
        dto.entitlements,
      );
    }
    if (dto.templateKeys !== undefined) {
      const keys = [...new Set(dto.templateKeys)];
      if (
        keys.some(
          (key) =>
            typeof key !== 'string' || !/^[a-z][a-z0-9-]{1,79}$/.test(key),
        )
      ) {
        throw new BadRequestException('One or more template keys are invalid');
      }
      await client.query(
        `DELETE FROM billing_plan_templates
         WHERE plan_configuration_id=$1::uuid`,
        [configurationId],
      );
      for (const key of keys) {
        await client.query(
          `INSERT INTO billing_plan_templates(plan_configuration_id,template_key)
           VALUES ($1::uuid,$2)`,
          [configurationId, key],
        );
      }
    }
  }

  private async replacePlanPermissions(
    client: PoolClient,
    configurationId: string,
    values: Record<string, unknown>,
  ): Promise<void> {
    const ids = Object.keys(values);
    const permissions = ids.length
      ? await client.query<PermissionRow>(
          `SELECT id::text,permission_key AS key,
                  field_schema AS "fieldSchema",
                  supports_approval AS "supportsApproval"
           FROM auth_permissions
           WHERE id=ANY($1::uuid[]) AND status='active'
             AND permission_key LIKE 'business:%'`,
          [ids],
        )
      : { rows: [] as PermissionRow[], rowCount: 0 };
    if (permissions.rowCount !== ids.length) {
      throw new BadRequestException(
        'One or more business permissions do not exist or are inactive',
      );
    }
    await client.query(
      `DELETE FROM billing_plan_permissions
       WHERE plan_configuration_id=$1::uuid`,
      [configurationId],
    );
    for (const permission of permissions.rows) {
      const raw = values[permission.id];
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new BadRequestException(`Invalid rule for ${permission.key}`);
      }
      const rule = this.validatePermissionRule(
        permission,
        raw as Record<string, unknown>,
      );
      await client.query(
        `INSERT INTO billing_plan_permissions
          (plan_configuration_id,permission_id,access_mode,field_modes,resource_scope,conditions)
         VALUES ($1::uuid,$2::uuid,$3,$4::jsonb,$5::jsonb,$6::jsonb)`,
        [
          configurationId,
          permission.id,
          rule.accessMode,
          JSON.stringify(rule.fieldModes),
          JSON.stringify(rule.resourceScope),
          JSON.stringify(rule.conditions),
        ],
      );
    }
  }

  private validatePermissionRule(
    permission: PermissionRow,
    raw: Record<string, unknown>,
  ): {
    accessMode: 'direct' | 'approval' | 'deny';
    fieldModes: Record<string, 'direct' | 'approval' | 'deny'>;
    resourceScope: Record<string, unknown>;
    conditions: Record<string, unknown>;
  } {
    const accessMode = raw.accessMode;
    if (!['direct', 'approval', 'deny'].includes(String(accessMode))) {
      throw new BadRequestException(
        `Invalid access mode for ${permission.key}`,
      );
    }
    if (accessMode === 'approval' && !permission.supportsApproval) {
      throw new BadRequestException(
        `${permission.key} does not support approval mode`,
      );
    }
    const fieldModes =
      raw.fieldModes &&
      typeof raw.fieldModes === 'object' &&
      !Array.isArray(raw.fieldModes)
        ? (raw.fieldModes as Record<string, unknown>)
        : {};
    const registeredFields = new Set(Object.keys(permission.fieldSchema || {}));
    const normalizedFields: Record<string, 'direct' | 'approval' | 'deny'> = {};
    for (const [field, mode] of Object.entries(fieldModes)) {
      if (!registeredFields.has(field)) {
        throw new BadRequestException(
          `Unsupported field "${field}" for ${permission.key}`,
        );
      }
      if (!['direct', 'approval', 'deny'].includes(String(mode))) {
        throw new BadRequestException(`Invalid field mode for ${field}`);
      }
      if (mode === 'approval' && !permission.supportsApproval) {
        throw new BadRequestException(
          `${permission.key} does not support approval fields`,
        );
      }
      normalizedFields[field] = mode as 'direct' | 'approval' | 'deny';
    }
    const resourceScope =
      raw.resourceScope &&
      typeof raw.resourceScope === 'object' &&
      !Array.isArray(raw.resourceScope)
        ? (raw.resourceScope as Record<string, unknown>)
        : { type: 'all' };
    if (!['all', 'selected'].includes(String(resourceScope.type))) {
      throw new BadRequestException(
        'Resource scope type must be all or selected',
      );
    }
    if (
      resourceScope.type === 'selected' &&
      (!Array.isArray(resourceScope.ids) ||
        resourceScope.ids.some((id) => typeof id !== 'string'))
    ) {
      throw new BadRequestException(
        'Selected resource scope requires string IDs',
      );
    }
    const conditions =
      raw.conditions &&
      typeof raw.conditions === 'object' &&
      !Array.isArray(raw.conditions)
        ? (raw.conditions as Record<string, unknown>)
        : {};
    return {
      accessMode: accessMode as 'direct' | 'approval' | 'deny',
      fieldModes: normalizedFields,
      resourceScope,
      conditions,
    };
  }

  private assertValue(entitlement: EntitlementRow, value: unknown) {
    const valid =
      entitlement.valueType === 'boolean'
        ? typeof value === 'boolean'
        : entitlement.valueType === 'integer'
          ? typeof value === 'number' &&
            Number.isSafeInteger(value) &&
            value >= -1
          : typeof value === 'string' && value.length <= 500;
    if (!valid)
      throw new BadRequestException(`Invalid value for ${entitlement.key}`);
  }

  private async invalidatePlanBusinesses(planId: string) {
    const businessIds =
      await this.repository.businessIdsForPermissionProfile(planId);
    await Promise.all(
      businessIds.map((businessId) => this.invalidateBusiness(businessId)),
    );
  }

  /**
   * Drops the cached public pricing list.
   *
   * That list is served from one Redis entry for five minutes and is not
   * re-derived per request, so every mutation that changes what the marketing
   * plan table shows — price, name, trial length, order, status, the
   * entitlements and templates behind a plan, or removing one outright — has
   * to clear it. Nothing did, so a pricing change or a deleted plan stayed on
   * the public page until the entry expired.
   *
   * Never allowed to fail the mutation it follows: the plan change is already
   * committed by this point, and a Redis outage must not turn a saved edit into
   * an error. A stale list expires on its own.
   */
  private async invalidatePublicPlans() {
    try {
      await this.redis.del(PUBLIC_PLANS_CACHE_KEY);
    } catch (error) {
      this.logger.warn(
        `Failed to clear the public plan cache: ${describeError(error)}`,
      );
    }
  }

  private async invalidateSubscriptionPlanBusinesses(
    subscriptionPlanId: string,
  ) {
    const businessIds =
      await this.repository.businessIdsForSubscriptionPlan(subscriptionPlanId);
    await Promise.all(
      businessIds.map((businessId) => this.invalidateBusiness(businessId)),
    );
  }

  private async invalidateEntitlementUsers(entitlementId: string) {
    const businessIds =
      await this.repository.businessIdsForEntitlement(entitlementId);
    await Promise.all(
      businessIds.map((businessId) => this.invalidateBusiness(businessId)),
    );
  }

  private async invalidateBusiness(businessId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`entitlements:business:${businessId}`),
      this.redis.del(`authorization:business-policy:${businessId}`),
      this.redis.del(`templates:business:${businessId}`),
      // The published advertising payload is cached by subdomain and the
      // entitlement lives inside the query that cache short-circuits, so a
      // downgrade would otherwise keep serving a paid public page until the
      // TTL lapsed. Failure here must not fail the plan change: a stale cache
      // costs minutes, a rolled-back downgrade costs the operator their edit.
      this.advertising
        .invalidatePublicCacheForBusiness(businessId)
        .catch(() => undefined),
    ]);
  }
}
