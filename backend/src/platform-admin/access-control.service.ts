import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { SimulateAuthorizationDto } from './dto/access-control.dto';

@Injectable()
export class AccessControlService {
  constructor(private readonly database: DatabaseService) {}

  async getOverview() {
    const [permissions, profiles] = await Promise.all([
      this.database.query(
        `SELECT permission.id::text, permission.permission_key AS key,
                permission.category, permission.resource, permission.action,
                permission.description,
                permission.risk_level AS "riskLevel",
                permission.display_order AS "displayOrder",
                permission.field_schema AS "fieldSchema",
                permission.supports_approval AS "supportsApproval",
                COALESCE(
                  array_agg(DISTINCT plan.name ORDER BY plan.name)
                    FILTER (WHERE plan.id IS NOT NULL),
                  '{}'
                ) AS profiles
         FROM auth_permissions permission
         LEFT JOIN billing_plan_permissions rule
           ON rule.permission_id = permission.id
         LEFT JOIN billing_plan_configurations configuration
           ON configuration.id = rule.plan_configuration_id
         LEFT JOIN billing_plans plan
           ON plan.id = configuration.plan_id AND plan.status = 'active'
         WHERE permission.permission_key LIKE 'business:%'
           AND permission.status = 'active'
         GROUP BY permission.id
         ORDER BY permission.display_order, permission.resource, permission.action`,
      ),
      this.database.query(
        `SELECT plan.id::text, plan.code, plan.name,
                plan.is_default AS "isDefault",
                configuration.id::text AS "configurationId",
                COUNT(DISTINCT rule.permission_id)::int AS "permissionCount",
                COUNT(DISTINCT subscription.id)::int AS "subscriberCount"
         FROM billing_plans plan
         JOIN billing_plan_configurations configuration
           ON configuration.plan_id = plan.id
         LEFT JOIN billing_plan_permissions rule
           ON rule.plan_configuration_id = configuration.id
         LEFT JOIN business_subscriptions subscription
           ON subscription.plan_id = plan.id
         WHERE plan.status = 'active'
         GROUP BY plan.id, configuration.id
         ORDER BY plan.display_order, plan.name`,
      ),
    ]);

    return {
      permissions: permissions.rows,
      profiles: profiles.rows,
      summary: {
        permissions: permissions.rowCount || 0,
        profiles: profiles.rowCount || 0,
      },
    };
  }

  async simulate(dto: SimulateAuthorizationDto) {
    const result = await this.database.query<{
      planName: string;
      fieldSchema: Record<string, string>;
      accessMode: 'direct' | 'approval' | 'deny' | null;
      fieldModes: Record<string, 'direct' | 'approval' | 'deny'> | null;
    }>(
      `SELECT plan.name AS "planName",
              permission.field_schema AS "fieldSchema",
              rule.access_mode AS "accessMode",
              rule.field_modes AS "fieldModes"
       FROM billing_plan_configurations configuration
       JOIN billing_plans plan ON plan.id = configuration.plan_id
       JOIN auth_permissions permission ON permission.permission_key = $2
       LEFT JOIN billing_plan_permissions rule
         ON rule.plan_configuration_id = configuration.id
        AND rule.permission_id = permission.id
       WHERE plan.id = $1::uuid
         AND permission.status = 'active'
         AND permission.permission_key LIKE 'business:%'`,
      [dto.planId, dto.permission],
    );
    const policy = result.rows[0];
    if (!policy) {
      throw new NotFoundException('Permission profile or action not found');
    }

    const changedFields = [...new Set(dto.changedFields || [])];
    const knownFields = new Set(Object.keys(policy.fieldSchema || {}));
    const deniedFields = changedFields.filter(
      (field) =>
        !knownFields.has(field) ||
        (policy.fieldModes?.[field] || policy.accessMode) === 'deny',
    );
    const approvalFields = changedFields.filter(
      (field) =>
        knownFields.has(field) &&
        (policy.fieldModes?.[field] || policy.accessMode) === 'approval',
    );

    let outcome: 'allow' | 'deny' | 'approval' = 'allow';
    let reason = 'GRANTED';
    if (!policy.accessMode || policy.accessMode === 'deny') {
      outcome = 'deny';
      reason = 'NO_PERMISSION';
    } else if (deniedFields.length) {
      outcome = 'deny';
      reason = 'FIELD_DENIED';
    } else if (policy.accessMode === 'approval' || approvalFields.length) {
      outcome = 'approval';
      reason = 'APPROVAL_REQUIRED';
    }

    const effective = await this.database.query<{ permission: string }>(
      `SELECT permission.permission_key AS permission
       FROM billing_plan_permissions rule
       JOIN auth_permissions permission ON permission.id = rule.permission_id
       JOIN billing_plan_configurations configuration
         ON configuration.id = rule.plan_configuration_id
       WHERE configuration.plan_id = $1::uuid
         AND rule.access_mode <> 'deny'
       ORDER BY permission.display_order, permission.permission_key`,
      [dto.planId],
    );

    return {
      allowed: outcome === 'allow',
      outcome,
      reason,
      deniedFields,
      approvalFields,
      effectivePermissions: effective.rows.map((row) => row.permission),
      profile: {
        name: policy.planName,
      },
    };
  }
}
