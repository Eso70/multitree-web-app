import type { PoolClient } from 'pg';
import { inTransaction } from '../src/database/migration-transaction';

/** Normalizes existing media policy data; schema is owned by migrations. */
export async function ensurePlatformMedia(client: PoolClient): Promise<void> {
  await inTransaction(client, async () => {
    await client.query(
      `INSERT INTO public.platform_media_settings (id)
       VALUES (1) ON CONFLICT (id) DO NOTHING;
       UPDATE public.platform_media_settings
          SET allowed_formats = ARRAY(
            SELECT format FROM unnest(allowed_formats) AS format
             WHERE format = ANY(ARRAY['jpeg','png','ico']::text[])
          );
       UPDATE public.platform_media_settings
          SET allowed_formats = ARRAY['jpeg','png','ico']::text[]
        WHERE cardinality(allowed_formats) = 0`,
    );
  });
}
