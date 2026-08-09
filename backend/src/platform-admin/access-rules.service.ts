import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccessRuleQueryDto } from './dto/access-rule-query.dto';
import { CreateAccessRuleDto } from './dto/create-access-rule.dto';

@Injectable()
export class AccessRulesService {
  constructor(private readonly database: DatabaseService) {}

  async getPage(query: AccessRuleQueryDto) {
    const params: unknown[] = [];
    const where: string[] = [];
    const add = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    if (query.effect) where.push(`ar.effect = ${add(query.effect)}`);
    if (query.scope) where.push(`ar.scope = ${add(query.scope)}`);
    if (query.status === 'expired') where.push(`ar.expires_at <= NOW()`);
    else if (query.status !== 'all')
      where.push(`ar.status = ${add(query.status)}`);
    if (query.search.trim()) {
      const p = add(`%${query.search.trim()}%`);
      where.push(
        `(host(ar.ip_network) ILIKE ${p} OR ar.ip_network::text ILIKE ${p} OR ar.reason ILIKE ${p} OR b.name ILIKE ${p} OR lt.name ILIKE ${p})`,
      );
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const order = {
      newest: 'ar.created_at DESC',
      oldest: 'ar.created_at ASC',
      mostMatched: 'ar.match_count DESC, ar.created_at DESC',
      recentlyMatched: 'ar.last_matched_at DESC NULLS LAST, ar.created_at DESC',
    }[query.sort];
    const offset = (query.page - 1) * query.pageSize;
    const count = await this.database.query<{ count: string }>(
      `SELECT COUNT(*)::text count FROM access_rules ar LEFT JOIN businesses b ON b.id=ar.business_id LEFT JOIN linktrees lt ON lt.id=ar.linktree_id ${clause}`,
      params,
    );
    const limitParam = add(query.pageSize);
    const offsetParam = add(offset);
    const rows = await this.database.query(
      `SELECT ar.id, ar.effect, ar.scope, ar.ip_network::text AS "ipNetwork", ar.reason, ar.status, ar.expires_at AS "expiresAt", ar.match_count::text AS "matchCount", ar.last_matched_at AS "lastMatchedAt", ar.created_at AS "createdAt", ar.business_id AS "businessId", b.name AS "businessLabel", ar.linktree_id AS "linktreeId", lt.name AS "linktreeLabel", sa.name AS "createdBy" FROM access_rules ar LEFT JOIN businesses b ON b.id=ar.business_id LEFT JOIN linktrees lt ON lt.id=ar.linktree_id LEFT JOIN platform_admins sa ON sa.id=ar.created_by ${clause} ORDER BY ${order} LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );
    const totalItems = Number(count.rows[0]?.count || 0);
    const summary = await this.database.query<{
      active_deny: string;
      active_allow: string;
      temporary: string;
      matches_24h: string;
    }>(
      `SELECT COUNT(*) FILTER (WHERE effect='deny' AND status='active' AND (expires_at IS NULL OR expires_at>NOW()))::text active_deny, COUNT(*) FILTER (WHERE effect='allow' AND status='active' AND (expires_at IS NULL OR expires_at>NOW()))::text active_allow, COUNT(*) FILTER (WHERE status='active' AND expires_at>NOW())::text temporary, COALESCE(SUM(match_count) FILTER (WHERE last_matched_at >= NOW()-INTERVAL '24 hours'),0)::text matches_24h FROM access_rules`,
    );
    return {
      items: rows.rows,
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      summary: {
        activeDeny: Number(summary.rows[0]?.active_deny || 0),
        activeAllow: Number(summary.rows[0]?.active_allow || 0),
        temporary: Number(summary.rows[0]?.temporary || 0),
        matches24h: Number(summary.rows[0]?.matches_24h || 0),
      },
    };
  }

  async create(dto: CreateAccessRuleDto, createdBy?: string) {
    if (
      [
        'business',
        'business_admin',
        'public_linktree',
        'business_api',
      ].includes(dto.scope) &&
      !dto.businessId
    )
      throw new BadRequestException('A business is required for this scope');
    if (dto.scope === 'public_linktree' && !dto.linktreeId)
      throw new BadRequestException(
        'A public linktree is required for this scope',
      );
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date())
      throw new BadRequestException('Expiration must be in the future');
    try {
      const result = await this.database.query(
        `INSERT INTO access_rules(effect,scope,ip_network,business_id,linktree_id,reason,expires_at,created_by) VALUES($1,$2,$3::cidr,$4,$5,$6,$7,$8) RETURNING id`,
        [
          dto.effect,
          dto.scope,
          dto.ipNetwork,
          dto.businessId || null,
          dto.linktreeId || null,
          dto.reason,
          dto.expiresAt || null,
          createdBy || null,
        ],
      );
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '22P02')
        throw new BadRequestException(
          'Enter a valid IPv4, IPv6, or CIDR range',
        );
      throw error;
    }
  }

  async update(id: string, dto: CreateAccessRuleDto) {
    if (
      [
        'business',
        'business_admin',
        'public_linktree',
        'business_api',
      ].includes(dto.scope) &&
      !dto.businessId
    )
      throw new BadRequestException('A business is required for this scope');
    if (dto.scope === 'public_linktree' && !dto.linktreeId)
      throw new BadRequestException(
        'A public linktree is required for this scope',
      );
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date())
      throw new BadRequestException('Expiration must be in the future');
    try {
      const result = await this.database.query(
        `UPDATE access_rules SET effect=$2, scope=$3, ip_network=$4::cidr, business_id=$5, linktree_id=$6, reason=$7, expires_at=$8, updated_at=NOW() WHERE id=$1 RETURNING id`,
        [
          id,
          dto.effect,
          dto.scope,
          dto.ipNetwork,
          dto.businessId || null,
          dto.linktreeId || null,
          dto.reason,
          dto.expiresAt || null,
        ],
      );
      if (!result.rowCount)
        throw new NotFoundException('Access rule not found');
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '22P02')
        throw new BadRequestException(
          'Enter a valid IPv4, IPv6, or CIDR range',
        );
      throw error;
    }
  }

  async setStatus(id: string, status: 'active' | 'inactive') {
    const result = await this.database.query(
      `UPDATE access_rules SET status=$2 WHERE id=$1 RETURNING id`,
      [id, status],
    );
    if (!result.rowCount) throw new NotFoundException('Access rule not found');
    return result.rows[0];
  }

  async remove(id: string) {
    const result = await this.database.query(
      `DELETE FROM access_rules WHERE id=$1`,
      [id],
    );
    if (!result.rowCount) throw new NotFoundException('Access rule not found');
  }
}
