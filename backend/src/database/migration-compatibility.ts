import type { PoolClient } from 'pg';

export const REQUIRED_TABLES = [
  'businesses',
  'business_sessions',
  'business_branding',
  'business_defaults',
  'platform_admins',
  'platform_admin_sessions',
  'auth_permissions',
  'billing_entitlements',
  'schema_migrations',
  'linktrees',
  'links',
  'communication_announcements',
  'communication_notifications',
  'communication_conversations',
  'communication_messages',
  'api_clients',
  'api_rate_limit_policies',
  'api_usage_daily',
  'api_idempotency_keys',
  'api_external_resource_mappings',
  'api_assets',
  'api_webhook_endpoints',
  'api_webhook_subscriptions',
  'api_webhook_events',
  'api_webhook_deliveries',
  'api_webhook_delivery_attempts',
  'api_versions',
  'api_catalog_groups',
  'api_linktree_schedules',
  'platform_data_retention_settings',
  'platform_data_retention_runs',
  'platform_media_settings',
  'uploaded_media_assets',
  'advertising_pages',
  'advertising_sections',
  'advertising_package_categories',
  'advertising_package_tiers',
  'advertising_results',
  'advertising_testimonials',
  'advertising_faqs',
  'advertising_payment_providers',
  'advertising_page_versions',
  'public_page_tombstones',
  'creator_accounts',
  'creator_trial_claims',
  'creator_registration_attempts',
  'root_public_slugs',
] as const;

const RETIRED_MINI_WEBSITE_TABLES = [
  'mini_websites',
  'mini_website_sections',
  'mini_website_social_links',
  'mini_website_locations',
  'mini_website_hours',
  'mini_website_items',
  'mini_website_versions',
] as const;

export const REQUIRED_COLUMNS = [
  ['businesses', 'onboarding_step'],
  ['businesses', 'onboarding_version'],
  ['businesses', 'onboarding_completed_at'],
  ['business_sessions', 'remembered'],
  ['platform_admin_sessions', 'remembered'],
  ['businesses', 'account_type'],
  ['creator_trial_claims', 'google_subject_hmac'],
  ['creator_trial_claims', 'device_hmac'],
  ['communication_announcements', 'encrypted_content'],
  ['communication_notifications', 'encrypted_content'],
  ['communication_conversations', 'encrypted_subject'],
  ['communication_conversations', 'sponsor_krd_key'],
  ['communication_messages', 'encrypted_body'],
  ['api_versions', 'last_notified_at'],
  ['api_versions', 'notification_count'],
] as const;

const OBSOLETE_COLUMNS = [
  ['platform_data_retention_settings', 'audit_log_days'],
  // Compatibility check for databases created before the SponsorKrd
  // communication-key terminology was consolidated.
  ['communication_conversations', 'system_key'],
] as const;

const RETIRED_MINI_WEBSITE_COLUMNS = [
  ['public_pages', 'source_mini_website_id'],
  ['creator_accounts', 'mini_website_id'],
  ['root_public_slugs', 'mini_website_id'],
] as const;

const REQUIRED_INDEXES = [
  'idx_communication_conversations_sponsor_krd_key',
  'uq_api_versions_current',
  'uq_platform_retention_running',
  'idx_uploaded_media_assets_created',
  'idx_public_page_tombstones_slug',
  'uq_businesses_one_platform_workspace',
  'creator_trial_claims_google_subject_hmac_idx',
  'creator_trial_claims_device_hmac_idx',
] as const;

type SchemaCompatibilityOptions = {
  /**
   * Accept the exact column/index names used immediately before the
   * Sponsor.krd rebrand migration. This is only for the safety check that runs
   * before pending forward migrations; the post-migration check stays strict.
   */
  allowPendingSponsorKrdRebrand?: boolean;
  /** Accept the feature schema only while its forward removal is pending. */
  allowPendingMiniWebsiteRemoval?: boolean;
};

const LEGACY_SPONSOR_KRD_COLUMN = [
  'communication_conversations',
  'multitree_key',
] as const;
const LEGACY_SPONSOR_KRD_INDEX =
  'idx_communication_conversations_multitree_key';

export async function assertSupportedSchema(
  client: PoolClient,
  options: SchemaCompatibilityOptions = {},
): Promise<void> {
  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [[...REQUIRED_TABLES, ...RETIRED_MINI_WEBSITE_TABLES]],
  );
  const foundTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter(
    (table) => !foundTables.has(table),
  );
  const foundRetiredTables = options.allowPendingMiniWebsiteRemoval
    ? []
    : RETIRED_MINI_WEBSITE_TABLES.filter((table) => foundTables.has(table));

  const columns = await client.query<{
    table_name: string;
    column_name: string;
  }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          SELECT * FROM unnest($1::text[], $2::text[])
        )`,
    [
      [
        ...REQUIRED_COLUMNS,
        ...OBSOLETE_COLUMNS,
        ...RETIRED_MINI_WEBSITE_COLUMNS,
        LEGACY_SPONSOR_KRD_COLUMN,
      ].map(([table]) => table),
      [
        ...REQUIRED_COLUMNS,
        ...OBSOLETE_COLUMNS,
        ...RETIRED_MINI_WEBSITE_COLUMNS,
        LEGACY_SPONSOR_KRD_COLUMN,
      ].map(([, column]) => column),
    ],
  );
  const foundColumns = new Set(
    columns.rows.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const hasLegacySponsorKrdColumn = foundColumns.has(
    LEGACY_SPONSOR_KRD_COLUMN.join('.'),
  );
  const hasSponsorKrdColumn = foundColumns.has(
    'communication_conversations.sponsor_krd_key',
  );
  const missingColumns = REQUIRED_COLUMNS.filter(([table, column]) => {
    if (foundColumns.has(`${table}.${column}`)) return false;
    return !(
      options.allowPendingSponsorKrdRebrand &&
      table === 'communication_conversations' &&
      column === 'sponsor_krd_key' &&
      hasLegacySponsorKrdColumn
    );
  }).map(([table, column]) => `${table}.${column}`);
  const foundObsoleteColumns = OBSOLETE_COLUMNS.filter(([table, column]) =>
    foundColumns.has(`${table}.${column}`),
  ).map(([table, column]) => `${table}.${column}`);
  if (!options.allowPendingMiniWebsiteRemoval) {
    foundObsoleteColumns.push(
      ...RETIRED_MINI_WEBSITE_COLUMNS.filter(([table, column]) =>
        foundColumns.has(`${table}.${column}`),
      ).map(([table, column]) => `${table}.${column}`),
    );
  }
  if (
    hasLegacySponsorKrdColumn &&
    (!options.allowPendingSponsorKrdRebrand || hasSponsorKrdColumn)
  ) {
    foundObsoleteColumns.push(LEGACY_SPONSOR_KRD_COLUMN.join('.'));
  }

  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])`,
    [[...REQUIRED_INDEXES, LEGACY_SPONSOR_KRD_INDEX]],
  );
  const foundIndexes = new Set(indexes.rows.map((row) => row.indexname));
  const hasLegacySponsorKrdIndex = foundIndexes.has(LEGACY_SPONSOR_KRD_INDEX);
  const hasSponsorKrdIndex = foundIndexes.has(
    'idx_communication_conversations_sponsor_krd_key',
  );
  const missingIndexes = REQUIRED_INDEXES.filter((index) => {
    if (foundIndexes.has(index)) return false;
    return !(
      options.allowPendingSponsorKrdRebrand &&
      index === 'idx_communication_conversations_sponsor_krd_key' &&
      hasLegacySponsorKrdIndex
    );
  });
  const foundObsoleteIndexes =
    hasLegacySponsorKrdIndex &&
    (!options.allowPendingSponsorKrdRebrand || hasSponsorKrdIndex)
      ? [LEGACY_SPONSOR_KRD_INDEX]
      : [];

  const catalog = await client.query<{
    public_page_entitlement: boolean;
    advertising_permissions: boolean;
    advertising_entitlement: boolean;
    retired_mini_website_catalog: boolean;
    platform_content_permissions: boolean;
    creator_permissions: boolean;
    platform_workspace: boolean;
  }>(`
    SELECT
      EXISTS (
        SELECT 1
          FROM billing_entitlements
         WHERE entitlement_key = 'limit.linktrees'
           AND name = 'Public page limit'
           AND unit = 'pages'
      ) AS public_page_entitlement,
      (
        SELECT count(*) = 4
          FROM auth_permissions
         WHERE permission_key IN (
                 'business:pages:advertising-access',
                 'business:advertising:read',
                 'business:advertising:update',
                 'business:advertising:publish'
               )
           AND status = 'active'
      ) AS advertising_permissions,
      EXISTS (
        SELECT 1
          FROM billing_entitlements
         WHERE entitlement_key = 'feature.advertising_page'
      ) AS advertising_entitlement,
      NOT EXISTS (
        SELECT 1 FROM billing_entitlements
         WHERE entitlement_key = 'feature.mini_websites'
      ) AND NOT EXISTS (
        SELECT 1 FROM auth_permissions
         WHERE permission_key LIKE '%mini-websites%'
      ) AS retired_mini_website_catalog,
      (
        SELECT count(*) = 7
          FROM auth_permissions
         WHERE permission_key IN (
           'platform:settings:tiktok-read',
           'platform:settings:tiktok-update',
           'platform:linktrees:read',
           'platform:linktrees:create',
           'platform:linktrees:update',
           'platform:linktrees:delete',
           'platform:linktrees:upload'
         ) AND status = 'active'
      ) AS platform_content_permissions,
      (
        SELECT count(*) = 2
          FROM auth_permissions
         WHERE permission_key IN (
           'platform:creators:read', 'platform:creators:manage'
         ) AND status = 'active'
      ) AS creator_permissions,
      EXISTS (
        SELECT 1 FROM businesses
         WHERE id = '00000000-0000-4000-8000-000000000001'
           AND account_type = 'platform'
      ) AS platform_workspace
  `);
  const catalogState = catalog.rows[0];
  const missingCatalogEntries = [
    !catalogState?.public_page_entitlement
      ? 'limit.linktrees public-page definition'
      : null,
    !catalogState?.advertising_permissions
      ? 'business:advertising:* permission set'
      : null,
    !catalogState?.advertising_entitlement
      ? 'feature.advertising_page entitlement'
      : null,
    !catalogState?.retired_mini_website_catalog &&
    !options.allowPendingMiniWebsiteRemoval
      ? 'retired mini-website catalog entries'
      : null,
    !catalogState?.platform_content_permissions
      ? 'platform content permission set'
      : null,
    !catalogState?.creator_permissions
      ? 'platform Creator permission set'
      : null,
    !catalogState?.platform_workspace ? 'platform content workspace' : null,
  ].filter((entry): entry is string => entry !== null);

  if (
    missingTables.length ||
    foundRetiredTables.length ||
    missingColumns.length ||
    foundObsoleteColumns.length ||
    missingIndexes.length ||
    foundObsoleteIndexes.length ||
    missingCatalogEntries.length
  ) {
    throw new Error(
      `Unsupported or partial database schema. Missing tables: ${missingTables.join(', ') || 'none'}; obsolete tables: ${foundRetiredTables.join(', ') || 'none'}; missing columns: ${missingColumns.join(', ') || 'none'}; obsolete columns: ${foundObsoleteColumns.join(', ') || 'none'}; missing indexes: ${missingIndexes.join(', ') || 'none'}; obsolete indexes: ${foundObsoleteIndexes.join(', ') || 'none'}; missing catalog entries: ${missingCatalogEntries.join(', ') || 'none'}. Restore a database that matches full_schema.sql or recreate an intentionally disposable database with db:reset. No baseline was recorded.`,
    );
  }
}
