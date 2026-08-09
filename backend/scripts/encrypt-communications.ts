import type { PoolClient } from 'pg';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { inTransaction } from '../src/database/migration-transaction';

function encryptContent(value: Record<string, unknown>): Buffer {
  const secret =
    process.env.APP_ENCRYPTION_KEY || process.env.SESSION_SECRET || '';
  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), encrypted]);
}

export async function encryptPrivateCommunications(client: PoolClient) {
  await inTransaction(client, async () => {
    await encryptPrivateCommunicationsInTransaction(client);
  });
}

async function encryptPrivateCommunicationsInTransaction(client: PoolClient) {
  const tables = await client.query<{ ready: boolean }>(
    `SELECT to_regclass('public.communication_announcements') IS NOT NULL
      AND to_regclass('public.communication_messages') IS NOT NULL AS ready`,
  );
  if (!tables.rows[0]?.ready) return;

  // The action URL rewrite is a compatibility cleanup for notifications
  // persisted before the console became a concealed dynamic route.
  await client.query(`
    UPDATE communication_conversations SET multitree_key='business_welcome'
    WHERE multitree_key IS NULL AND created_by_type='platform-admin'
      AND category='account' AND subject='بەخێربێیت بۆ MultiTree';
    UPDATE communication_notifications
    SET action_url=regexp_replace(
      action_url,
      '^/system/communication-center',
      '/communication-center'
    )
    WHERE recipient_type='platform-admin'
      AND action_url LIKE '/system/communication-center%';
  `);

  const announcements = await client.query<{
    id: string;
    title: string;
    message: string;
  }>(
    `SELECT id::text, title, message FROM communication_announcements
     WHERE encrypted_content IS NULL
       AND NOT (channels @> ARRAY['homepage']::text[])`,
  );
  for (const item of announcements.rows) {
    await client.query(
      `UPDATE communication_announcements
       SET title='[encrypted]', message='[encrypted]', encrypted_content=$2
       WHERE id=$1::uuid`,
      [item.id, encryptContent({ title: item.title, body: item.message })],
    );
  }

  const conversations = await client.query<{ id: string; subject: string }>(
    `SELECT id::text, subject FROM communication_conversations
     WHERE encrypted_subject IS NULL`,
  );
  for (const item of conversations.rows) {
    await client.query(
      `UPDATE communication_conversations
       SET subject='[encrypted]', encrypted_subject=$2 WHERE id=$1::uuid`,
      [item.id, encryptContent({ value: item.subject })],
    );
  }

  const messages = await client.query<{ id: string; body: string }>(
    `SELECT id::text, body FROM communication_messages
     WHERE encrypted_body IS NULL`,
  );
  for (const item of messages.rows) {
    await client.query(
      `UPDATE communication_messages
       SET body='[encrypted]', encrypted_body=$2 WHERE id=$1::uuid`,
      [item.id, encryptContent({ value: item.body })],
    );
  }

  const notifications = await client.query<{
    id: string;
    title: string;
    body: string;
  }>(
    `SELECT id::text, title, body FROM communication_notifications
     WHERE encrypted_content IS NULL`,
  );
  for (const item of notifications.rows) {
    await client.query(
      `UPDATE communication_notifications
       SET title='[encrypted]', body='[encrypted]', encrypted_content=$2
       WHERE id=$1::uuid`,
      [item.id, encryptContent({ title: item.title, body: item.body })],
    );
  }

  console.log('  OK Private communication encryption checked');
}
