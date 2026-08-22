import { ENTITLEMENT, entitledSql } from '../billing/entitlement-sql';

/**
 * Positive allowlist shared by browser Pixel reads and Events API outbox writes.
 * Both callers alias the owner row as `business`.
 */
export const TIKTOK_OWNER_ELIGIBLE_SQL = `(
  business.account_type = 'platform'
  OR (
    business.account_type = 'business'
    AND ${entitledSql(ENTITLEMENT.tiktok)}
  )
  OR (
    business.account_type = 'creator'
    AND EXISTS (
      SELECT 1
        FROM creator_accounts creator
       WHERE creator.business_id = business.id
         AND creator.status = 'active'
         AND (
           creator.paid_started_at IS NOT NULL
           OR creator.grace_ends_at > NOW()
         )
    )
  )
)`;
