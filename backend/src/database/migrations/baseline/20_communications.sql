--
-- 20_communications.sql
--
-- Communication Center: announcements, deliveries, inboxes, conversations.
--
-- Part of the MultiTree baseline. `src/database/baseline.ts` lists the parts
-- and the order they are applied in; they are one schema split for reading,
-- not independent scripts.
--

-- Communication Center: announcements, recipient deliveries, notification inboxes,
-- two-way business conversations, and public homepage placements.

CREATE TABLE public.communication_announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar(160) NOT NULL,
    message text NOT NULL,
    announcement_type varchar(30) NOT NULL DEFAULT 'general',
    priority varchar(20) NOT NULL DEFAULT 'normal',
    audience_type varchar(20) NOT NULL DEFAULT 'all',
    audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
    channels text[] NOT NULL DEFAULT ARRAY['business_bell']::text[],
    status varchar(20) NOT NULL DEFAULT 'draft',
    cta_label varchar(80),
    cta_url varchar(500),
    publish_at timestamptz,
    published_at timestamptz,
    expires_at timestamptz,
    archived_at timestamptz,
    encrypted_content bytea,
    created_by uuid NOT NULL REFERENCES public.platform_admins(id) ON DELETE RESTRICT,
    published_by uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT communication_announcements_type_check CHECK (
      announcement_type IN ('general', 'feature', 'maintenance', 'billing', 'security', 'urgent')
    ),
    CONSTRAINT communication_announcements_priority_check CHECK (
      priority IN ('normal', 'important', 'critical')
    ),
    CONSTRAINT communication_announcements_audience_check CHECK (
      audience_type IN ('all', 'plans', 'businesses')
    ),
    CONSTRAINT communication_announcements_status_check CHECK (
      status IN ('draft', 'scheduled', 'published', 'expired', 'archived')
    ),
    CONSTRAINT communication_announcements_audience_filter_check CHECK (
      jsonb_typeof(audience_filter) = 'object'
    ),
    CONSTRAINT communication_announcements_channels_check CHECK (
      cardinality(channels) > 0
      AND channels <@ ARRAY['business_bell', 'dashboard_banner', 'homepage']::text[]
    ),
    CONSTRAINT communication_announcements_schedule_check CHECK (
      expires_at IS NULL OR publish_at IS NULL OR expires_at > publish_at
    )
);

CREATE TABLE public.communication_announcement_deliveries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id uuid NOT NULL REFERENCES public.communication_announcements(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'delivered',
    delivered_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz,
    archived_at timestamptz,
    CONSTRAINT communication_announcement_delivery_status_check CHECK (
      status IN ('pending', 'delivered', 'failed', 'read', 'archived')
    ),
    CONSTRAINT communication_announcement_delivery_unique UNIQUE (announcement_id, business_id)
);

CREATE TABLE public.communication_notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_type varchar(20) NOT NULL,
    platform_admin_id uuid REFERENCES public.platform_admins(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    kind varchar(40) NOT NULL,
    priority varchar(20) NOT NULL DEFAULT 'normal',
    title varchar(160) NOT NULL,
    body text NOT NULL,
    source_type varchar(40),
    source_id uuid,
    action_url varchar(500),
    read_at timestamptz,
    archived_at timestamptz,
    encrypted_content bytea,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT communication_notifications_recipient_type_check CHECK (
      recipient_type IN ('platform-admin', 'business')
    ),
    CONSTRAINT communication_notifications_priority_check CHECK (
      priority IN ('normal', 'important', 'critical')
    ),
    CONSTRAINT communication_notifications_recipient_check CHECK (
      (recipient_type = 'platform-admin' AND platform_admin_id IS NOT NULL AND business_id IS NULL)
      OR
      (recipient_type = 'business' AND business_id IS NOT NULL AND platform_admin_id IS NULL)
    )
);

CREATE TABLE public.communication_conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subject varchar(160) NOT NULL,
    category varchar(30) NOT NULL DEFAULT 'other',
    priority varchar(20) NOT NULL DEFAULT 'normal',
    status varchar(20) NOT NULL DEFAULT 'open',
    assigned_admin_id uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    created_by_type varchar(20) NOT NULL,
    multitree_key varchar(80),
    last_message_at timestamptz NOT NULL DEFAULT now(),
    business_last_read_at timestamptz,
    platform_last_read_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    encrypted_subject bytea,
    CONSTRAINT communication_conversations_category_check CHECK (
      category IN ('account', 'billing', 'technical', 'feature_request', 'security', 'verification', 'other')
    ),
    CONSTRAINT communication_conversations_priority_check CHECK (
      priority IN ('normal', 'important', 'urgent')
    ),
    CONSTRAINT communication_conversations_status_check CHECK (
      status IN ('open', 'waiting_business', 'waiting_platform', 'resolved', 'archived')
    ),
    CONSTRAINT communication_conversations_creator_check CHECK (
      created_by_type IN ('platform-admin', 'business')
    )
);

CREATE TABLE public.communication_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.communication_conversations(id) ON DELETE CASCADE,
    sender_type varchar(20) NOT NULL,
    sender_admin_id uuid REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    sender_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
    body text NOT NULL,
    encrypted_body bytea,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at timestamptz,
    CONSTRAINT communication_messages_sender_type_check CHECK (
      sender_type IN ('platform-admin', 'business')
    ),
    CONSTRAINT communication_messages_sender_check CHECK (
      (sender_type = 'platform-admin' AND sender_admin_id IS NOT NULL AND sender_business_id IS NULL)
      OR
      (sender_type = 'business' AND sender_business_id IS NOT NULL AND sender_admin_id IS NULL)
    )
);

CREATE TABLE public.communication_homepage_placements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id uuid NOT NULL UNIQUE REFERENCES public.communication_announcements(id) ON DELETE CASCADE,
    placement varchar(30) NOT NULL DEFAULT 'top_banner',
    display_priority integer NOT NULL DEFAULT 0,
    is_dismissible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT communication_homepage_placement_check CHECK (
      placement IN ('top_banner', 'feature_card')
    )
);

CREATE INDEX idx_communication_announcements_status_schedule
  ON public.communication_announcements(status, publish_at, expires_at);
CREATE INDEX idx_communication_announcements_created_at
  ON public.communication_announcements(created_at DESC);
CREATE INDEX idx_communication_deliveries_business
  ON public.communication_announcement_deliveries(business_id, read_at, delivered_at DESC);
CREATE INDEX idx_communication_notifications_platform_unread
  ON public.communication_notifications(platform_admin_id, read_at, created_at DESC)
  WHERE recipient_type = 'platform-admin' AND archived_at IS NULL;
CREATE INDEX idx_communication_notifications_business_unread
  ON public.communication_notifications(business_id, read_at, created_at DESC)
  WHERE recipient_type = 'business' AND archived_at IS NULL;
CREATE INDEX idx_communication_conversations_business_activity
  ON public.communication_conversations(business_id, last_message_at DESC);
CREATE INDEX idx_communication_conversations_platform_queue
  ON public.communication_conversations(status, priority, last_message_at DESC);
CREATE UNIQUE INDEX idx_communication_conversations_multitree_key
  ON public.communication_conversations(business_id, multitree_key)
  WHERE multitree_key IS NOT NULL;
CREATE INDEX idx_communication_messages_conversation
  ON public.communication_messages(conversation_id, created_at ASC);
CREATE INDEX idx_communication_homepage_priority
  ON public.communication_homepage_placements(display_priority DESC);

INSERT INTO public.auth_permissions
  (permission_key, resource, action, description, risk_level, category,
   display_order, field_schema, supports_approval, status)
VALUES
  ('platform:communications:read', 'platform.communications', 'read',
   'View the Communication Center', 'standard', 'Communication Center', 640, '{}', false, 'active'),
  ('platform:communications:announcement-create', 'platform.communications', 'announcement-create',
   'Create and edit communication drafts', 'sensitive', 'Communication Center', 650, '{}', false, 'active'),
  ('platform:communications:announcement-publish', 'platform.communications', 'announcement-publish',
   'Publish and schedule announcements', 'critical', 'Communication Center', 660, '{}', false, 'active'),
  ('platform:communications:announcement-archive', 'platform.communications', 'announcement-archive',
   'Archive published communication', 'sensitive', 'Communication Center', 670, '{}', false, 'active'),
  ('platform:communications:conversation-reply', 'platform.communications', 'conversation-reply',
   'Reply to and manage business conversations', 'sensitive', 'Communication Center', 680, '{}', false, 'active'),
  ('platform:communications:homepage-manage', 'platform.communications', 'homepage-manage',
   'Publish public homepage communication', 'critical', 'Communication Center', 690, '{}', false, 'active')
ON CONFLICT (permission_key) DO UPDATE SET
  resource=EXCLUDED.resource,
  action=EXCLUDED.action,
  description=EXCLUDED.description,
  risk_level=EXCLUDED.risk_level,
  category=EXCLUDED.category,
  display_order=EXCLUDED.display_order,
  status='active',
  updated_at=NOW();

-- Idempotent starter content for the Communication Center. The runtime business
-- creation flow mirrors this seed so future accounts receive the same onboarding.
INSERT INTO public.communication_announcements
  (id, title, message, announcement_type, priority, audience_type,
   audience_filter, channels, status, cta_label, cta_url,
   publish_at, published_at, created_by, published_by)
SELECT seed.id, seed.title, seed.message, seed.announcement_type,
       seed.priority, 'all', '{}'::jsonb, seed.channels, 'published',
       seed.cta_label, seed.cta_url, now(), now(), admin.id, admin.id
FROM (
  VALUES
    ('7b100000-0000-4000-8000-000000000001'::uuid,
     'بەخێربێیت بۆ MultiTree',
     'بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.',
     'general', 'normal', ARRAY['business_bell']::text[], NULL, NULL)
) AS seed(id, title, message, announcement_type, priority, channels, cta_label, cta_url)
CROSS JOIN LATERAL (
  SELECT id FROM public.platform_admins ORDER BY created_at ASC, id ASC LIMIT 1
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
  updated_at=now();

INSERT INTO public.communication_announcement_deliveries
  (announcement_id, business_id, status)
SELECT a.id, b.id, 'delivered'
FROM public.communication_announcements a
CROSS JOIN public.businesses b
WHERE a.id IN (
  '7b100000-0000-4000-8000-000000000001'::uuid
) AND b.status='active'
ON CONFLICT (announcement_id, business_id) DO NOTHING;

INSERT INTO public.communication_notifications
  (recipient_type, business_id, kind, priority, title, body,
   source_type, source_id, action_url)
SELECT 'business', d.business_id, 'announcement', a.priority, a.title, a.message,
       'announcement', a.id, COALESCE(a.cta_url, '/business')
FROM public.communication_announcement_deliveries d
JOIN public.communication_announcements a ON a.id=d.announcement_id
WHERE a.id IN (
  '7b100000-0000-4000-8000-000000000001'::uuid
) AND NOT EXISTS (
  SELECT 1 FROM public.communication_notifications n
  WHERE n.recipient_type='business' AND n.business_id=d.business_id
    AND n.source_type='announcement' AND n.source_id=a.id
);

UPDATE public.communication_notifications n
SET title=a.title, body=a.message, priority=a.priority,
    action_url=COALESCE(a.cta_url, '/business'), encrypted_content=NULL
FROM public.communication_announcements a
WHERE n.recipient_type='business'
  AND n.source_type='announcement' AND n.source_id=a.id
  AND a.id IN (
    '7b100000-0000-4000-8000-000000000001'::uuid
  );

DELETE FROM public.communication_announcements
WHERE id IN (
  '7b100000-0000-4000-8000-000000000002'::uuid,
  '7b100000-0000-4000-8000-000000000003'::uuid
);

DO $communication_seed$
DECLARE
  seed_admin uuid;
  target record;
  thread_id uuid;
  welcome_body text;
BEGIN
  SELECT id INTO seed_admin FROM public.platform_admins
  ORDER BY created_at ASC, id ASC LIMIT 1;
  IF seed_admin IS NULL THEN RETURN; END IF;

  FOR target IN SELECT id, name FROM public.businesses LOOP
    SELECT id INTO thread_id FROM public.communication_conversations
    WHERE business_id=target.id AND multitree_key='business_welcome'
    ORDER BY created_at ASC LIMIT 1;

    IF thread_id IS NULL THEN
      INSERT INTO public.communication_conversations
        (business_id, subject, category, priority, status, multitree_key, assigned_admin_id,
         created_by_type, platform_last_read_at)
      VALUES (target.id, 'بەخێربێیت بۆ MultiTree', 'account', 'normal',
              'waiting_business', 'business_welcome', seed_admin, 'platform-admin', now())
      RETURNING id INTO thread_id;

      welcome_body := 'سڵاو ' || target.name ||
        '، بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.';

      INSERT INTO public.communication_messages
        (conversation_id, sender_type, sender_admin_id, body)
      VALUES (thread_id, 'platform-admin', seed_admin, welcome_body);

      INSERT INTO public.communication_notifications
        (recipient_type, business_id, kind, priority, title, body,
         source_type, source_id, action_url)
      VALUES ('business', target.id, 'platform_reply', 'important',
              'بەخێربێیت بۆ MultiTree', welcome_body, 'conversation', thread_id,
              '/business?communication=' || thread_id::text);
    ELSE
      welcome_body := 'سڵاو ' || target.name ||
        '، بەخێربێیت بۆ MultiTree. هیوادارین ئەزموونێکی خۆشت هەبێت.';
      UPDATE public.communication_messages
      SET body=welcome_body, encrypted_body=NULL
      WHERE id=(SELECT id FROM public.communication_messages
                WHERE conversation_id=thread_id AND sender_type='platform-admin'
                ORDER BY created_at ASC LIMIT 1);
      UPDATE public.communication_notifications
      SET title='بەخێربێیت بۆ MultiTree', body=welcome_body,
          encrypted_content=NULL
      WHERE recipient_type='business' AND business_id=target.id
        AND source_type='conversation' AND source_id=thread_id;
    END IF;
  END LOOP;
END
$communication_seed$;

