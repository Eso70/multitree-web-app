-- Permanently retire the Mini Website product. The migration runner wraps this
-- file and its ledger entry in one transaction, so any failure rolls back the
-- complete removal.

DO $$
DECLARE constraint_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'creator_accounts'
       AND column_name = 'mini_website_id'
  ) THEN
    UPDATE public.creator_accounts
       SET page_type = NULL,
           mini_website_id = NULL,
           page_reservation_token = NULL,
           page_reservation_expires_at = NULL,
           updated_at = now()
     WHERE page_type = 'mini_website' OR mini_website_id IS NOT NULL;

    FOR constraint_name IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = 'public.creator_accounts'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%mini_website%'
    LOOP
      EXECUTE format('ALTER TABLE public.creator_accounts DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE public.creator_accounts DROP COLUMN mini_website_id;
    ALTER TABLE public.creator_accounts
      ADD CONSTRAINT creator_accounts_page_type_check
        CHECK (page_type IS NULL OR page_type = 'linktree'),
      ADD CONSTRAINT creator_accounts_page_identity_check
        CHECK ((page_type IS NULL AND linktree_id IS NULL) OR page_type = 'linktree'),
      ADD CONSTRAINT creator_accounts_page_reservation_check
        CHECK (
          (page_reservation_token IS NULL AND page_reservation_expires_at IS NULL)
          OR (page_reservation_token IS NOT NULL
            AND page_reservation_expires_at IS NOT NULL
            AND linktree_id IS NULL)
        );
  END IF;
END
$$;

DO $$
DECLARE constraint_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'root_public_slugs'
       AND column_name = 'mini_website_id'
  ) THEN
    DELETE FROM public.root_public_slugs
     WHERE page_type = 'mini_website' OR mini_website_id IS NOT NULL;

    FOR constraint_name IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = 'public.root_public_slugs'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%mini_website%'
    LOOP
      EXECUTE format('ALTER TABLE public.root_public_slugs DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE public.root_public_slugs DROP COLUMN mini_website_id;
    ALTER TABLE public.root_public_slugs
      ADD CONSTRAINT root_public_slugs_page_type_check CHECK (page_type = 'linktree'),
      ADD CONSTRAINT root_public_slugs_page_identity_check
        CHECK (page_type = 'linktree' AND linktree_id IS NOT NULL);
  END IF;
END
$$;

DO $$
DECLARE constraint_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'public_pages'
       AND column_name = 'source_mini_website_id'
  ) THEN
    DELETE FROM public.public_page_tombstones WHERE page_type = 'mini_website';
    DELETE FROM public.public_pages
     WHERE page_type = 'mini_website' OR source_mini_website_id IS NOT NULL;

    FOR constraint_name IN
      SELECT conname FROM pg_constraint
       WHERE conrelid = 'public.public_pages'::regclass
         AND contype = 'c'
         AND pg_get_constraintdef(oid) ILIKE '%mini_website%'
    LOOP
      EXECUTE format('ALTER TABLE public.public_pages DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE public.public_pages DROP COLUMN source_mini_website_id;
    ALTER TABLE public.public_pages
      ADD CONSTRAINT public_pages_page_type_check
        CHECK (page_type IN ('linktree', 'advertising', 'route')),
      ADD CONSTRAINT public_pages_source_check CHECK (
        (page_type = 'linktree' AND source_linktree_id IS NOT NULL
          AND source_advertising_page_id IS NULL)
        OR (page_type = 'advertising' AND source_advertising_page_id IS NOT NULL
          AND source_linktree_id IS NULL)
        OR (page_type = 'route' AND source_linktree_id IS NULL
          AND source_advertising_page_id IS NULL)
      );
  END IF;
END
$$;

DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.public_page_tombstones'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%mini_website%'
  LOOP
    EXECUTE format('ALTER TABLE public.public_page_tombstones DROP CONSTRAINT %I', constraint_name);
    ALTER TABLE public.public_page_tombstones
      ADD CONSTRAINT public_page_tombstones_page_type_check
        CHECK (page_type IN ('linktree', 'advertising'));
  END LOOP;

  FOR constraint_name IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.analytics_events'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%mini_website%'
  LOOP
    EXECUTE format('ALTER TABLE public.analytics_events DROP CONSTRAINT %I', constraint_name);
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_page_type_check
        CHECK (page_type IN ('linktree', 'advertising'));
  END LOOP;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.mini_websites') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_mini_public_page_sync ON public.mini_websites;
    DROP TRIGGER IF EXISTS trg_sync_root_mini_website_slug ON public.mini_websites;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.fn_sync_mini_public_page();
DROP FUNCTION IF EXISTS public.fn_sync_root_mini_website_slug();

DROP TABLE IF EXISTS public.mini_website_lead_forms;
DROP TABLE IF EXISTS public.mini_website_versions;
DROP TABLE IF EXISTS public.mini_website_items;
DROP TABLE IF EXISTS public.mini_website_hours;
DROP TABLE IF EXISTS public.mini_website_locations;
DROP TABLE IF EXISTS public.mini_website_social_links;
DROP TABLE IF EXISTS public.mini_website_sections;
DROP TABLE IF EXISTS public.mini_websites;

DELETE FROM public.permission_approval_requests
 WHERE permission_id IN (
   SELECT id FROM public.auth_permissions
    WHERE permission_key LIKE '%mini-websites%'
 );
DELETE FROM public.billing_plan_permissions
 WHERE permission_id IN (
   SELECT id FROM public.auth_permissions
    WHERE permission_key LIKE '%mini-websites%'
 );
DELETE FROM public.platform_permission_denies
 WHERE permission_id IN (
   SELECT id FROM public.auth_permissions
    WHERE permission_key LIKE '%mini-websites%'
 );
DELETE FROM public.auth_permissions WHERE permission_key LIKE '%mini-websites%';

DELETE FROM public.billing_plan_entitlements
 WHERE entitlement_id IN (
   SELECT id FROM public.billing_entitlements
    WHERE entitlement_key = 'feature.mini_websites'
 );
DELETE FROM public.billing_entitlements
 WHERE entitlement_key = 'feature.mini_websites';
DELETE FROM public.billing_plan_templates WHERE template_key = 'liquid-glass';

UPDATE public.billing_entitlements
   SET description = 'Maximum active Linktrees', updated_at = now()
 WHERE entitlement_key = 'limit.linktrees';
