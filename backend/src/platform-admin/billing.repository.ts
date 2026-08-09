import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BillingRepository {
  constructor(private readonly database: DatabaseService) {}

  async permissionCatalog(): Promise<Record<string, unknown>[]> {
    const result = await this.database.query<Record<string, unknown>>(
      `SELECT id::text, permission_key AS key, category, resource, action,
              description, risk_level AS "riskLevel",
              display_order AS "displayOrder", field_schema AS fields,
              supports_approval AS "supportsApproval", status
       FROM auth_permissions
       WHERE status='active' AND permission_key LIKE 'business:%'
       ORDER BY display_order, permission_key`,
    );
    return result.rows;
  }

  async businessIdsForSubscriptionPlan(planId: string): Promise<string[]> {
    const result = await this.database.query<{ business_id: string }>(
      `SELECT DISTINCT business_id::text
       FROM business_subscriptions
       WHERE subscription_plan_id=$1::uuid`,
      [planId],
    );
    return result.rows.map((row) => row.business_id);
  }

  async businessIdsForPermissionProfile(planId: string): Promise<string[]> {
    const result = await this.database.query<{ business_id: string }>(
      `SELECT DISTINCT business_id::text
       FROM business_subscriptions WHERE plan_id=$1::uuid`,
      [planId],
    );
    return result.rows.map((row) => row.business_id);
  }

  async businessIdsForEntitlement(entitlementId: string): Promise<string[]> {
    const result = await this.database.query<{ business_id: string }>(
      `SELECT DISTINCT subscription.business_id::text
       FROM business_subscriptions subscription
       JOIN billing_plan_entitlements plan_entitlement
         ON plan_entitlement.plan_configuration_id=subscription.plan_configuration_id
       WHERE plan_entitlement.entitlement_id=$1::uuid`,
      [entitlementId],
    );
    return result.rows.map((row) => row.business_id);
  }
}
