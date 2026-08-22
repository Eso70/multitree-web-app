/**
 * The cached public pricing list.
 *
 * `GET /api/public/plans` is the marketing site's plan table, and it is served
 * from this key for five minutes rather than re-queried per request. Every
 * platform-side plan mutation therefore has to drop it: renaming a plan,
 * changing its price or trial length, reordering, deactivating, editing the
 * entitlements or templates behind it, and deleting one outright all change
 * what that endpoint returns.
 *
 * The key lived only as a literal inside the read, and nothing anywhere
 * deleted it — so a price edit or a deleted plan stayed on the public page
 * until the entry expired. Named here so the read and every writer name the
 * same thing.
 */
export const PUBLIC_PLANS_CACHE_KEY = 'cache:public:plans';

/** How long the public plan list may be served without re-reading it. */
export const PUBLIC_PLANS_CACHE_TTL_SECONDS = 300;
