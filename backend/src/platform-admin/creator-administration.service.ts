import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionService } from '../auth/session.service';
import { DatabaseService } from '../database/database.service';
import {
  ListCreatorsDto,
  ManageCreatorDto,
} from '../creator/dto/manage-creator.dto';

@Injectable()
export class CreatorAdministrationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly sessions: SessionService,
  ) {}

  async list(query: ListCreatorsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim() || null;
    const offset = (page - 1) * limit;
    const params: unknown[] = [search, query.status || null, limit, offset];
    const where = `WHERE ($1::text IS NULL OR user_account.email ILIKE '%' || $1 || '%'
                              OR user_account.display_name ILIKE '%' || $1 || '%'
                              OR COALESCE(linktree.seo_name, website.slug, '') ILIKE '%' || $1 || '%')
                     AND ($2::text IS NULL OR creator.status = $2)`;
    const [rows, count, stats] = await Promise.all([
      this.database.query(
        `SELECT creator.id, creator.business_id, creator.status,
                creator.phone_last_four, creator.phone_verified_at,
                creator.page_type, creator.trial_started_at,
                creator.trial_ends_at, creator.grace_ends_at,
                creator.paid_started_at, creator.risk_level,
                creator.last_login_at, creator.created_at,
                user_account.email, user_account.display_name,
                COALESCE(linktree.seo_name, website.slug) AS page_slug,
                CASE
                  WHEN creator.paid_started_at IS NOT NULL THEN 'active'
                  WHEN creator.trial_started_at IS NULL THEN 'not_started'
                  WHEN creator.trial_ends_at > NOW() THEN 'trialing'
                  WHEN creator.grace_ends_at > NOW() THEN 'grace_period'
                  ELSE 'expired'
                END AS billing_status
           FROM creator_accounts creator
           JOIN users user_account ON user_account.id=creator.user_id
           LEFT JOIN linktrees linktree ON linktree.id=creator.linktree_id
           LEFT JOIN mini_websites website ON website.id=creator.mini_website_id
           ${where}
          ORDER BY creator.created_at DESC LIMIT $3 OFFSET $4`,
        params,
      ),
      this.database.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM creator_accounts creator
           JOIN users user_account ON user_account.id=creator.user_id
           LEFT JOIN linktrees linktree ON linktree.id=creator.linktree_id
           LEFT JOIN mini_websites website ON website.id=creator.mini_website_id
           ${where}`,
        params.slice(0, 2),
      ),
      this.database.query<{
        total: string;
        trialing: string;
        paid: string;
        suspended: string;
      }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE trial_ends_at > NOW() AND paid_started_at IS NULL)::text AS trialing,
                COUNT(*) FILTER (WHERE paid_started_at IS NOT NULL)::text AS paid,
                COUNT(*) FILTER (WHERE status='suspended')::text AS suspended
           FROM creator_accounts`,
      ),
    ]);
    const total = Number(count.rows[0]?.count || 0);
    return {
      items: rows.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: Object.fromEntries(
        Object.entries(stats.rows[0] || {}).map(([key, value]) => [
          key,
          Number(value),
        ]),
      ),
    };
  }

  async manage(id: string, data: ManageCreatorDto) {
    const account = await this.database.query<{
      business_id: string;
      trial_started_at: string | null;
    }>(
      'SELECT business_id, trial_started_at FROM creator_accounts WHERE id=$1',
      [id],
    );
    const current = account.rows[0];
    if (!current) throw new NotFoundException('Creator account not found');

    switch (data.action) {
      case 'suspend':
        await this.database.query(
          `UPDATE creator_accounts SET status='suspended' WHERE id=$1`,
          [id],
        );
        await this.sessions.revokeBusinessSessions(current.business_id);
        break;
      case 'reactivate':
        await this.database.query(
          `UPDATE creator_accounts SET status='active' WHERE id=$1`,
          [id],
        );
        break;
      case 'activate_paid':
        await this.database.query(
          `UPDATE creator_accounts SET status='active', paid_started_at=NOW() WHERE id=$1`,
          [id],
        );
        break;
      case 'cancel_paid':
        await this.database.query(
          `UPDATE creator_accounts SET paid_started_at=NULL WHERE id=$1`,
          [id],
        );
        break;
      case 'extend_trial': {
        if (!data.days)
          throw new BadRequestException('Extension days are required');
        const base = current.trial_started_at
          ? 'GREATEST(trial_ends_at, NOW())'
          : 'NOW()';
        await this.database.query(
          `UPDATE creator_accounts
              SET status='active',
                  trial_started_at=COALESCE(trial_started_at, NOW()),
                  trial_ends_at=${base} + make_interval(days => $2),
                  grace_ends_at=${base} + make_interval(days => $2 + 3)
            WHERE id=$1`,
          [id, data.days],
        );
        break;
      }
    }
    return this.database
      .query('SELECT * FROM creator_accounts WHERE id=$1', [id])
      .then((result) => result.rows[0]);
  }
}
