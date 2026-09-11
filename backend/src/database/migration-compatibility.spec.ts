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
    'uq_platform_retention_running',
    'idx_uploaded_media_assets_created',
    'idx_public_page_tombstones_slug',
    'uq_businesses_one_platform_workspace',
    'idx_linktrees_business_campaign_active',
    'idx_linktrees_business_default_campaign',
    'idx_linktrees_business_archived',
  ],
  catalog = {
    public_page_entitlement: true,
    advertising_permissions: true,
    advertising_entitlement: true,
    linktree_update_fields: true,
    platform_content_permissions: true,
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

  it('rejects a schema with an outdated required catalog', async () => {
    await expect(
      assertSupportedSchema(
        clientWithSchema([...REQUIRED_TABLES], requiredColumns, undefined, {
          public_page_entitlement: false,
          advertising_permissions: true,
          advertising_entitlement: true,
          linktree_update_fields: true,
          platform_content_permissions: true,
          platform_workspace: true,
        }),
      ),
    ).rejects.toThrow(/missing catalog entries/);
  });
});
