import {
  assertSupportedSchema,
  REQUIRED_COLUMNS,
  REQUIRED_TABLES,
} from './migration-compatibility';

function clientWithSchema(
  tables: string[],
  columns: string[],
  indexes = [
    'idx_communication_conversations_multitree_key',
    'uq_api_versions_current',
    'uq_platform_retention_running',
    'idx_uploaded_media_assets_created',
    'uq_mini_items_key',
    'idx_public_page_tombstones_slug',
  ],
  catalog = {
    mini_website_create_permission: true,
    public_page_entitlement: true,
    advertising_permissions: true,
    advertising_entitlement: true,
    mini_website_entitlement: true,
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
      if (sql.includes('AS mini_website_create_permission')) {
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
          mini_website_create_permission: false,
          public_page_entitlement: true,
          advertising_permissions: true,
          advertising_entitlement: true,
          mini_website_entitlement: true,
        }),
      ),
    ).rejects.toThrow(/missing catalog entries/);
  });
});
