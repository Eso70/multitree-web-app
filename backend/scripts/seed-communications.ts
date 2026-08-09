import type { PoolClient } from 'pg';

export async function seedDefaultCommunications(client: PoolClient) {
  const tables = await client.query<{ ready: boolean }>(
    `SELECT to_regclass('public.communication_announcements') IS NOT NULL
      AND to_regclass('public.communication_conversations') IS NOT NULL AS ready`,
  );
  if (!tables.rows[0]?.ready) {
    console.warn(
      '  ! Communication seed skipped: communication tables are missing',
    );
    return;
  }

  await client.query(`
    INSERT INTO communication_announcements
      (id, title, message, announcement_type, priority, audience_type,
       audience_filter, channels, status, cta_label, cta_url,
       publish_at, published_at, created_by, published_by)
    SELECT seed.id, seed.title, seed.message, seed.announcement_type,
           seed.priority, 'all', '{}'::jsonb, seed.channels, 'published',
           seed.cta_label, seed.cta_url, NOW(), NOW(), admin.id, admin.id
    FROM (
      VALUES
        ('7b100000-0000-4000-8000-000000000001'::uuid,
         'بەخێربێیت بۆ MultiTree',
         'بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.',
         'general', 'normal', ARRAY['business_bell']::text[],
         NULL, NULL)
    ) AS seed(id, title, message, announcement_type, priority, channels, cta_label, cta_url)
    CROSS JOIN LATERAL (
      SELECT id FROM platform_admins ORDER BY created_at ASC, id ASC LIMIT 1
    ) admin
    ON CONFLICT (id) DO UPDATE SET
      title=EXCLUDED.title,
      message=EXCLUDED.message,
      announcement_type=EXCLUDED.announcement_type,
      priority=EXCLUDED.priority,
      channels=EXCLUDED.channels,
      cta_label=EXCLUDED.cta_label,
      cta_url=EXCLUDED.cta_url,
      encrypted_content=NULL,
      updated_at=NOW();

    INSERT INTO communication_announcement_deliveries
      (announcement_id, business_id, status)
    SELECT a.id, b.id, 'delivered'
    FROM communication_announcements a
    CROSS JOIN businesses b
    WHERE a.id IN (
      '7b100000-0000-4000-8000-000000000001'::uuid
    )
      AND b.status='active'
    ON CONFLICT (announcement_id, business_id) DO NOTHING;

    INSERT INTO communication_notifications
      (recipient_type, business_id, kind, priority, title, body,
       source_type, source_id, action_url)
    SELECT 'business', d.business_id, 'announcement', a.priority,
           a.title, a.message, 'announcement', a.id, COALESCE(a.cta_url, '/business')
    FROM communication_announcement_deliveries d
    JOIN communication_announcements a ON a.id=d.announcement_id
    WHERE a.id IN (
      '7b100000-0000-4000-8000-000000000001'::uuid
    )
      AND NOT EXISTS (
        SELECT 1 FROM communication_notifications n
        WHERE n.recipient_type='business' AND n.business_id=d.business_id
          AND n.source_type='announcement' AND n.source_id=a.id
      );

    UPDATE communication_notifications n
    SET title=a.title, body=a.message, priority=a.priority,
        action_url=COALESCE(a.cta_url, '/business'), encrypted_content=NULL
    FROM communication_announcements a
    WHERE n.recipient_type='business'
      AND n.source_type='announcement' AND n.source_id=a.id
      AND a.id IN (
        '7b100000-0000-4000-8000-000000000001'::uuid
      );

    DELETE FROM communication_announcements
    WHERE id IN (
      '7b100000-0000-4000-8000-000000000002'::uuid,
      '7b100000-0000-4000-8000-000000000003'::uuid
    );

    DO $seed$
    DECLARE
      seed_admin uuid;
      target record;
      thread_id uuid;
      welcome_body text;
    BEGIN
      SELECT id INTO seed_admin
      FROM platform_admins ORDER BY created_at ASC, id ASC LIMIT 1;
      IF seed_admin IS NULL THEN RETURN; END IF;

      FOR target IN SELECT id, name FROM businesses LOOP
        SELECT id INTO thread_id
        FROM communication_conversations
        WHERE business_id=target.id AND multitree_key='business_welcome'
        ORDER BY created_at ASC LIMIT 1;

        IF thread_id IS NULL THEN
          INSERT INTO communication_conversations
            (business_id, subject, category, priority, status, multitree_key, assigned_admin_id,
             created_by_type, platform_last_read_at)
          VALUES (target.id, 'بەخێربێیت بۆ MultiTree', 'account', 'normal',
                  'waiting_business', 'business_welcome', seed_admin, 'platform-admin', NOW())
          RETURNING id INTO thread_id;

          welcome_body := 'سڵاو ' || target.name ||
            '، بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.';

          INSERT INTO communication_messages
            (conversation_id, sender_type, sender_admin_id, body)
          VALUES (thread_id, 'platform-admin', seed_admin, welcome_body);

          INSERT INTO communication_notifications
            (recipient_type, business_id, kind, priority, title, body,
             source_type, source_id, action_url)
          VALUES ('business', target.id, 'platform_reply', 'important',
                  'بەخێربێیت بۆ MultiTree', welcome_body, 'conversation', thread_id,
                  '/business?communication=' || thread_id::text);
        ELSE
          welcome_body := 'سڵاو ' || target.name ||
            '، بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.';
          UPDATE communication_messages
          SET body=welcome_body, encrypted_body=NULL
          WHERE id=(SELECT id FROM communication_messages
                    WHERE conversation_id=thread_id AND sender_type='platform-admin'
                    ORDER BY created_at ASC LIMIT 1);
          UPDATE communication_notifications
          SET title='بەخێربێیت بۆ MultiTree', body=welcome_body,
              encrypted_content=NULL
          WHERE recipient_type='business' AND business_id=target.id
            AND source_type='conversation' AND source_id=thread_id;
        END IF;
      END LOOP;
    END
    $seed$;
  `);

  console.log('  OK Default communication content checked');
}
