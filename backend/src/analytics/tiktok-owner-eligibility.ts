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
)`;
