import type { PoolClient } from 'pg';
import { inTransaction } from '../src/database/migration-transaction';

/** Idempotent retention default data. Schema is owned by migrations. */
export async function ensurePlatformRetention(
  client: PoolClient,
): Promise<void> {
  await inTransaction(client, async () => {
    await client.query(
      `INSERT INTO public.platform_data_retention_settings (id)
       VALUES (1) ON CONFLICT (id) DO NOTHING`,
    );
  });
}
