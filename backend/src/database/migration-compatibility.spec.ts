import {
  assertSupportedSchema,
  REQUIRED_COLUMNS,
  REQUIRED_TABLES,
} from './migration-compatibility';

function clientWithSchema(
  tables: string[],
  columns: string[],
  indexes = [
    'idx_communication_conversations_sponsor_krd_key',
    'uq_api_versions_current',
    'uq_platform_retention_running',
    'idx_uploaded_media_assets_created',
    'idx_public_page_tombstones_slug',
    'uq_businesses_one_platform_workspace',
    'creator_trial_claims_google_subject_hmac_idx',
    'creator_trial_claims_device_hmac_idx',
  ],
  catalog = {
    public_page_entitlement: true,
    advertising_permissions: true,
    advertising_entitlement: true,
    retired_mini_website_catalog: true,
    platform_content_permissions: true,
    creator_permissions: true,
    platform_workspace: true,
  },
) {
  return {
    query: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return Promise.resolve({
          rows: tables.map((table_name) => ({ table_name })),
        });
      }
      if (sql.includes('pg_indexes')) {
        return Promise.resolve({
          rows: indexes.map((indexname) => ({ indexname })),
        });
      }
      if (sql.includes('AS public_page_entitlement')) {
        return Promise.resolve({ rows: [catalog] });
      }
      return Promise.resolve({
        rows: columns.map((value) => {
          const [table_name, column_name] = value.split('.');
          return { table_name, column_name };
        }),
      });
    }),
  } as never;
}

describe('migration compatibility checks', () => {
  const requiredColumns = REQUIRED_COLUMNS.map(
    ([table, column]) => `${table}.${column}`,
  );

  it('accepts the complete supported structure', async () => {
    await expect(
      assertSupportedSchema(
        clientWithSchema([...REQUIRED_TABLES], requiredColumns),
      ),
    ).resolves.toBeUndefined();
  });

  it('accepts the exact pre-rebrand communication names only before forward migrations', async () => {
    const legacyColumns = requiredColumns
      .filter(
        (column) => column !== 'communication_conversations.sponsor_krd_key',
      )
      .concat('communication_conversations.multitree_key');
    const legacyIndexes = [
      'idx_communication_conversations_multitree_key',
      'uq_api_versions_current',
      'uq_platform_retention_running',
      'idx_uploaded_media_assets_created',
      'idx_public_page_tombstones_slug',
      'uq_businesses_one_platform_workspace',
      'creator_trial_claims_google_subject_hmac_idx',
      'creator_trial_claims_device_hmac_idx',
    ];

    const legacyClient = clientWithSchema(
      [...REQUIRED_TABLES],
      legacyColumns,
      legacyIndexes,
    );
    await expect(assertSupportedSchema(legacyClient)).rejects.toThrow(
      /sponsor_krd_key/,
    );
    await expect(
      assertSupportedSchema(legacyClient, {
        allowPendingSponsorKrdRebrand: true,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects partial schemas without mutating them', async () => {
    await expect(
      assertSupportedSchema(clientWithSchema(['businesses'], [])),
    ).rejects.toThrow(/Unsupported or partial database schema/);
  });

  it('rejects a schema missing a required index', async () => {
    await expect(
      assertSupportedSchema(
        clientWithSchema([...REQUIRED_TABLES], requiredColumns, []),
      ),
    ).rejects.toThrow(/missing indexes/);
  });

  it('rejects a schema that still has a removed column', async () => {
    await expect(
      assertSupportedSchema(
        clientWithSchema(
          [...REQUIRED_TABLES],
          [
            ...requiredColumns,
            'platform_data_retention_settings.audit_log_days',
          ],
        ),
      ),
    ).rejects.toThrow(/obsolete columns/);
  });

  it('rejects a schema with an outdated required catalog', async () => {
    await expect(
      assertSupportedSchema(
        clientWithSchema([...REQUIRED_TABLES], requiredColumns, undefined, {
          public_page_entitlement: false,
          advertising_permissions: true,
          advertising_entitlement: true,
          retired_mini_website_catalog: true,
          platform_content_permissions: true,
          creator_permissions: true,
          platform_workspace: true,
        }),
      ),
    ).rejects.toThrow(/missing catalog entries/);
  });

  it('allows the retired feature schema only before its forward removal', async () => {
    const retiredTables = [
      'mini_websites',
      'mini_website_sections',
      'mini_website_social_links',
      'mini_website_locations',
      'mini_website_hours',
      'mini_website_items',
      'mini_website_versions',
    ];
    const retiredColumns = [
      'public_pages.source_mini_website_id',
      'creator_accounts.mini_website_id',
      'root_public_slugs.mini_website_id',
    ];
    const catalog = {
      public_page_entitlement: true,
      advertising_permissions: true,
      advertising_entitlement: true,
      retired_mini_website_catalog: false,
      platform_content_permissions: true,
      creator_permissions: true,
      platform_workspace: true,
    };
    const client = clientWithSchema(
      [...REQUIRED_TABLES, ...retiredTables],
      [...requiredColumns, ...retiredColumns],
      undefined,
      catalog,
    );

    await expect(assertSupportedSchema(client)).rejects.toThrow(
      /obsolete tables/,
    );
    await expect(
      assertSupportedSchema(client, { allowPendingMiniWebsiteRemoval: true }),
    ).resolves.toBeUndefined();
  });
});
