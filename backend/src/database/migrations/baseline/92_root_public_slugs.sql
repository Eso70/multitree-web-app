--
-- 92_root_public_slugs.sql
--
-- Global route locks for Linktrees owned by the platform workspace.
--

CREATE TABLE public.root_public_slugs (
  page_type varchar(20) NOT NULL CHECK (page_type = 'linktree'),
  slug varchar(255) NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  linktree_id uuid UNIQUE REFERENCES public.linktrees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_type, slug),
  CHECK (page_type = 'linktree' AND linktree_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.fn_sync_root_linktree_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_type varchar(20);
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.root_public_slugs WHERE linktree_id = OLD.id;
    RETURN OLD;
  END IF;
  SELECT account_type INTO owner_type
    FROM public.businesses WHERE id = NEW.business_id;
  IF owner_type = 'platform' THEN
    DELETE FROM public.root_public_slugs WHERE linktree_id = NEW.id;
    INSERT INTO public.root_public_slugs
      (page_type, slug, business_id, linktree_id)
    VALUES ('linktree', NEW.seo_name, NEW.business_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_root_linktree_slug
AFTER INSERT OR DELETE OR UPDATE OF seo_name, business_id ON public.linktrees
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_root_linktree_slug();

CREATE TRIGGER trg_root_public_slugs_updated_at
BEFORE UPDATE ON public.root_public_slugs
FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
