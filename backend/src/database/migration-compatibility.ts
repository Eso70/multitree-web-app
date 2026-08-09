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
  'mini_websites',
  'mini_website_sections',
  'mini_website_social_links',
  'mini_website_locations',
  'mini_website_hours',
  'mini_website_items',
  'mini_website_lead_forms',
  'mini_website_versions',
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
] as const;

export const REQUIRED_COLUMNS = [
  ['businesses', 'onboarding_step'],
  ['businesses', 'onboarding_version'],
  ['businesses', 'onboarding_completed_at'],
  ['business_sessions', 'remembered'],
  ['platform_admin_sessions', 'remembered'],
  ['communication_announcements', 'encrypted_content'],
  ['communication_notifications', 'encrypted_content'],
  ['communication_conversations', 'encrypted_subject'],
  ['communication_conversations', 'multitree_key'],
  ['communication_messages', 'encrypted_body'],
  ['api_versions', 'last_notified_at'],
  ['api_versions', 'notification_count'],
] as const;

const OBSOLETE_COLUMNS = [
  ['platform_data_retention_settings', 'audit_log_days'],
  // Compatibility check for databases created before the MultiTree
  // communication-key terminology was consolidated.
  ['communication_conversations', 'system_key'],
] as const;

const REQUIRED_INDEXES = [
  'idx_communication_conversations_multitree_key',
  'uq_api_versions_current',
  'uq_platform_retention_running',
  'idx_uploaded_media_assets_created',
  'uq_mini_items_key',
  'idx_public_page_tombstones_slug',
] as const;

export async function assertSupportedSchema(client: PoolClient): Promise<void> {
  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES],
  );
  const foundTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter(
    (table) => !foundTables.has(table),
  );

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
      [...REQUIRED_COLUMNS, ...OBSOLETE_COLUMNS].map(([table]) => table),
      [...REQUIRED_COLUMNS, ...OBSOLETE_COLUMNS].map(([, column]) => column),
    ],
  );
  const foundColumns = new Set(
    columns.rows.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const missingColumns = REQUIRED_COLUMNS.filter(
    ([table, column]) => !foundColumns.has(`${table}.${column}`),
  ).map(([table, column]) => `${table}.${column}`);
  const foundObsoleteColumns = OBSOLETE_COLUMNS.filter(([table, column]) =>
    foundColumns.has(`${table}.${column}`),
  ).map(([table, column]) => `${table}.${column}`);

  const indexes = await client.query<{ indexname: string }>(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])`,
    [REQUIRED_INDEXES],
  );
  const foundIndexes = new Set(indexes.rows.map((row) => row.indexname));
  const missingIndexes = REQUIRED_INDEXES.filter(
    (index) => !foundIndexes.has(index),
  );

  const catalog = await client.query<{
    mini_website_create_permission: boolean;
    public_page_entitlement: boolean;
    advertising_permissions: boolean;
    advertising_entitlement: boolean;
    mini_website_entitlement: boolean;
  }>(`
    SELECT
      EXISTS (
        SELECT 1
          FROM auth_permissions
         WHERE permission_key = 'business:mini-websites:create'
           AND status = 'active'
      ) AS mini_website_create_permission,
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
      EXISTS (
        SELECT 1
          FROM billing_entitlements
         WHERE entitlement_key = 'feature.mini_websites'
      ) AS mini_website_entitlement
  `);
  const catalogState = catalog.rows[0];
  const missingCatalogEntries = [
    !catalogState?.mini_website_create_permission
      ? 'business:mini-websites:create'
      : null,
    !catalogState?.public_page_entitlement
      ? 'limit.linktrees public-page definition'
      : null,
    !catalogState?.advertising_permissions
      ? 'business:advertising:* permission set'
      : null,
    !catalogState?.advertising_entitlement
      ? 'feature.advertising_page entitlement'
      : null,
    !catalogState?.mini_website_entitlement
      ? 'feature.mini_websites entitlement'
      : null,
  ].filter((entry): entry is string => entry !== null);

  if (
    missingTables.length ||
    missingColumns.length ||
    foundObsoleteColumns.length ||
    missingIndexes.length ||
    missingCatalogEntries.length
  ) {
    throw new Error(
      `Unsupported or partial database schema. Missing tables: ${missingTables.join(', ') || 'none'}; missing columns: ${missingColumns.join(', ') || 'none'}; obsolete columns: ${foundObsoleteColumns.join(', ') || 'none'}; missing indexes: ${missingIndexes.join(', ') || 'none'}; missing catalog entries: ${missingCatalogEntries.join(', ') || 'none'}. Restore a database that matches full_schema.sql or recreate an intentionally disposable database with db:reset. No baseline was recorded.`,
    );
  }
}
