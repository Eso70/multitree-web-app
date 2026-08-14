-- Stop giving MultiTree's own branding to businesses that never uploaded their
-- own logo or favicon.
--
-- `/images/Logo.jpg` is the platform's mark. It was both the column default and
-- the value written by every create path, so a business that skipped the
-- optional logo/favicon upload rendered MultiTree's logo on its public linktree,
-- its mini website, its navbar, and its browser tab icon. Those surfaces now
-- fall back to neutral, unbranded placeholders instead.
--
-- Only rows that still hold the platform paths are rewritten. A business that
-- uploaded its own asset keeps it -- the WHERE clauses match the exact literals
-- the old defaults wrote, so custom uploads are never touched.
--
-- `full_schema.sql` is deliberately left untouched: it is the frozen baseline,
-- and `db:migrate` runs the forward migrations after it on fresh databases too,
-- so fresh and existing databases converge on the same placeholders.
--
-- Scope is `business_branding` only:
--   * `platform_admins.logo` / `.favicon` keep `/images/Logo.jpg` and
--     `/favicon.ico`. That row is MultiTree's own console branding, not a
--     tenant's, and must keep the platform mark.
--   * `mini_websites` has no logo or favicon column -- only a nullable
--     `avatar` -- so there is nothing to rewrite there.
--   * `business_signup_applications.logo` / `.favicon` are nullable with no
--     default; the onboarding approval path supplies the placeholder in code.
--
-- `business_branding.default_avatar` is intentionally NOT changed. Its value
-- (`/images/DefaultAvatar.png`) is a sentinel that mini-website and linktree SQL
-- compares against to mean "still the default"; the avatar artwork behind that
-- path was replaced at the asset level, so every business picks up the new
-- image without a data change.

ALTER TABLE public.business_branding
  ALTER COLUMN logo SET DEFAULT '/images/business-logo-placeholder.png',
  ALTER COLUMN favicon SET DEFAULT '/images/business-favicon-placeholder.png';

UPDATE public.business_branding
   SET logo = '/images/business-logo-placeholder.png',
       updated_at = NOW()
 WHERE logo = '/images/Logo.jpg';

UPDATE public.business_branding
   SET favicon = '/images/business-favicon-placeholder.png',
       updated_at = NOW()
 WHERE favicon = '/favicon.ico';
