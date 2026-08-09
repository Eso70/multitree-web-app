import { ForbiddenException, Injectable } from '@nestjs/common';
import { isIP } from 'node:net';
import { DatabaseService } from '../database/database.service';

export type AccessRuleScope =
  | 'multitree'
  | 'platform_admin'
  | 'business'
  | 'business_admin'
  | 'public_linktree'
  | 'business_api';

export interface AccessRuleContext {
  scope: Exclude<AccessRuleScope, 'multitree'>;
  businessId?: string;
  linktreeId?: string;
}

type MatchingRule = {
  id: string;
  effect: 'allow' | 'deny';
};

@Injectable()
export class AccessRuleEnforcementService {
  constructor(private readonly database: DatabaseService) {}

  async assertAllowed(
    rawIp: string,
    contexts: AccessRuleContext[] = [],
  ): Promise<void> {
    if (!(await this.isAllowed(rawIp, contexts))) {
      throw new ForbiddenException('Request blocked by an access rule');
    }
  }

  async isAllowed(
    rawIp: string,
    contexts: AccessRuleContext[] = [],
  ): Promise<boolean> {
    const ip = rawIp
      .replace(/^::ffff:/, '')
      .split('%')[0]
      .trim();
    if (!isIP(ip)) return true;

    const params: unknown[] = [ip];
    const matches = [`rule.scope='multitree'`];
    const ranks = [`WHEN 'multitree' THEN 10`];
    const rankByScope: Record<AccessRuleContext['scope'], number> = {
      platform_admin: 50,
      business: 40,
      business_admin: 60,
      public_linktree: 70,
      business_api: 60,
    };

    for (const context of contexts) {
      const conditions = [`rule.scope=$${params.push(context.scope)}`];
      if (context.businessId) {
        conditions.push(`rule.business_id=$${params.push(context.businessId)}`);
      }
      if (context.linktreeId) {
        conditions.push(`rule.linktree_id=$${params.push(context.linktreeId)}`);
      }
      matches.push(`(${conditions.join(' AND ')})`);
      ranks.push(`WHEN '${context.scope}' THEN ${rankByScope[context.scope]}`);
    }

    const result = await this.database.query<MatchingRule>(
      `SELECT rule.id::text, rule.effect
       FROM access_rules rule
       WHERE rule.status='active'
         AND (rule.expires_at IS NULL OR rule.expires_at>now())
         AND rule.ip_network >>= $1::inet
         AND (${matches.join(' OR ')})
       ORDER BY CASE rule.scope ${ranks.join(' ')} ELSE 0 END DESC,
                masklen(rule.ip_network) DESC,
                CASE rule.effect WHEN 'deny' THEN 1 ELSE 0 END DESC,
                rule.created_at DESC, rule.id DESC
       LIMIT 1`,
      params,
    );
    const rule = result.rows[0];
    if (!rule) return true;

    await this.database.query(
      `UPDATE access_rules
       SET match_count=match_count+1,last_matched_at=now()
       WHERE id=$1`,
      [rule.id],
    );
    return rule.effect === 'allow';
  }

  async assertForBusinessSubdomain(
    rawIp: string,
    subdomain: string,
    specializedScope?: 'business_admin' | 'business_api',
  ): Promise<void> {
    const result = await this.database.query<{ id: string }>(
      `SELECT id::text FROM businesses
       WHERE lower(subdomain)=lower($1) AND status='active' LIMIT 1`,
      [subdomain],
    );
    const businessId = result.rows[0]?.id;
    if (!businessId) {
      await this.assertAllowed(rawIp);
      return;
    }
    const contexts: AccessRuleContext[] = [{ scope: 'business', businessId }];
    if (specializedScope)
      contexts.push({ scope: specializedScope, businessId });
    await this.assertAllowed(rawIp, contexts);
  }

  async assertForPublicLinktree(
    rawIp: string,
    subdomain: string,
    uid: string,
  ): Promise<void> {
    const result = await this.database.query<{
      business_id: string;
      linktree_id: string;
    }>(
      `SELECT business.id::text AS business_id, linktree.id::text AS linktree_id
       FROM businesses business
       JOIN linktrees linktree ON linktree.business_id=business.id
       WHERE lower(business.subdomain)=lower($1)
         AND business.status='active' AND linktree.status='active'
         AND (linktree.uid=$2 OR linktree.seo_name=$2)
       LIMIT 1`,
      [subdomain, uid],
    );
    const target = result.rows[0];
    if (!target) {
      await this.assertAllowed(rawIp);
      return;
    }
    await this.assertAllowed(rawIp, [
      { scope: 'business', businessId: target.business_id },
      {
        scope: 'public_linktree',
        businessId: target.business_id,
        linktreeId: target.linktree_id,
      },
    ]);
  }

  async assertForPublicPages(rawIp: string, pageIds: string[]): Promise<void> {
    const uniquePageIds = [...new Set(pageIds)];
    if (!uniquePageIds.length) {
      await this.assertAllowed(rawIp);
      return;
    }
    const result = await this.database.query<{ business_id: string }>(
      `SELECT DISTINCT business_id::text
       FROM public_pages WHERE id=ANY($1::uuid[])`,
      [uniquePageIds],
    );
    if (!result.rows.length) {
      await this.assertAllowed(rawIp);
      return;
    }
    for (const row of result.rows) {
      await this.assertAllowed(rawIp, [
        { scope: 'business', businessId: row.business_id },
      ]);
    }
  }
}
