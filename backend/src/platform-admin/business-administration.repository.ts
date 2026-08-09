import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { BusinessListQueryDto } from '../common/dto/admin-list-query.dto';

type BusinessListRow = {
  id: string;
  username: string;
  name: string;
  subdomain: string | null;
  status: string;
  plan: string | null;
  planName: string | null;
  subscriptionPlanId: string | null;
  max_linktrees: number | null;
  logo: string | null;
  favicon: string | null;
  default_avatar: string | null;
  website_color: string | null;
  created_at?: Date;
  updated_at?: Date;
};

@Injectable()
export class BusinessAdministrationRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(query: BusinessListQueryDto) {
    const search = query.search?.trim() || '';
    const pattern = `%${search}%`;
    const status = query.status || null;
    const offset = (query.page - 1) * query.limit;
    const where = `WHERE ($1 = '' OR a.name ILIKE $1 OR a.username ILIKE $1 OR a.subdomain ILIKE $1)
       AND ($2::text IS NULL OR a.status = $2)`;
    const [businesses, count, summary] = await Promise.all([
      this.database.query<BusinessListRow>(
        `SELECT a.id, a.username, a.name, a.subdomain, a.status,
           COALESCE(subscription_plan.code, a.plan) AS plan,
           COALESCE(subscription_plan.name, INITCAP(a.plan)) AS "planName",
           subscription_plan.id::text AS "subscriptionPlanId",
           a.max_linktrees, b.logo, b.favicon, b.default_avatar,
           b.website_color, a.created_at, a.updated_at
         FROM businesses a
         LEFT JOIN business_branding b ON b.business_id = a.id
         LEFT JOIN LATERAL (
           SELECT subscription_plan_id FROM business_subscriptions
           WHERE business_id = a.id ORDER BY created_at DESC LIMIT 1
         ) bs ON true
         LEFT JOIN billing_subscription_plans subscription_plan
           ON subscription_plan.id = bs.subscription_plan_id
         ${where}
         ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`,
        [pattern, status, query.limit, offset],
      ),
      this.database.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM businesses a ${where}`,
        [pattern, status],
      ),
      this.database.query<{
        total: number;
        active: number;
        suspended: number;
        pendingApplications: number;
        totalApplications: number;
        activeInvitations: number;
      }>(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
                (SELECT COUNT(*) FROM business_signup_applications WHERE status = 'pending')::int AS "pendingApplications",
                (SELECT COUNT(*) FROM business_signup_applications)::int AS "totalApplications",
                (SELECT COUNT(*) FROM business_signup_invitations WHERE consumed_at IS NULL AND revoked_at IS NULL AND expires_at > NOW())::int AS "activeInvitations"
         FROM businesses`,
      ),
    ]);
    return {
      rows: businesses.rows,
      total: Number(count.rows[0]?.total || 0),
      summary: summary.rows[0] || {
        total: 0,
        active: 0,
        suspended: 0,
        pendingApplications: 0,
        totalApplications: 0,
        activeInvitations: 0,
      },
    };
  }
}
