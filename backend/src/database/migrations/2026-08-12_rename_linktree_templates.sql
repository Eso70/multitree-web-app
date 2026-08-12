-- Rename the five active Linktree template identifiers without losing saved
-- business defaults, published pages, plan access, or global widget settings.

CREATE TEMP TABLE linktree_template_key_renames (
  old_key text PRIMARY KEY,
  new_key text UNIQUE NOT NULL
) ON COMMIT DROP;

INSERT INTO linktree_template_key_renames (old_key, new_key) VALUES
  ('colorful-pills', 'spectrum'),
  ('mobile-spotlight', 'spotlight'),
  ('frosted-outline', 'frost'),
  ('aurora-pills', 'aurora'),
  ('gentle-flow', 'serenity');

INSERT INTO public.billing_plan_templates (
  plan_configuration_id,
  template_key,
  created_at
)
SELECT plan_template.plan_configuration_id,
       rename.new_key,
       plan_template.created_at
  FROM public.billing_plan_templates plan_template
  JOIN linktree_template_key_renames rename
    ON rename.old_key = plan_template.template_key
ON CONFLICT (plan_configuration_id, template_key) DO NOTHING;

DELETE FROM public.billing_plan_templates plan_template
 USING linktree_template_key_renames rename
 WHERE plan_template.template_key = rename.old_key;

INSERT INTO public.template_global_settings (
  template_key,
  widget_config,
  updated_at
)
SELECT rename.new_key,
       setting.widget_config,
       setting.updated_at
  FROM public.template_global_settings setting
  JOIN linktree_template_key_renames rename
    ON rename.old_key = setting.template_key
ON CONFLICT (template_key) DO NOTHING;

DELETE FROM public.template_global_settings setting
 USING linktree_template_key_renames rename
 WHERE setting.template_key = rename.old_key;

UPDATE public.business_defaults defaults
   SET template_key = rename.new_key,
       updated_at = now()
  FROM linktree_template_key_renames rename
 WHERE defaults.template_key = rename.old_key;

UPDATE public.linktrees linktree
   SET template_key = rename.new_key,
       updated_at = now()
  FROM linktree_template_key_renames rename
 WHERE linktree.template_key = rename.old_key;

UPDATE public.linktrees linktree
   SET template_config = jsonb_set(
         linktree.template_config,
         '{templateKey}',
         to_jsonb(rename.new_key),
         true
       ),
       updated_at = now()
  FROM linktree_template_key_renames rename
 WHERE linktree.template_config->>'templateKey' = rename.old_key;

UPDATE public.linktrees linktree
   SET template_config = jsonb_set(
         linktree.template_config,
         '{template_key}',
         to_jsonb(rename.new_key),
         true
       ),
       updated_at = now()
  FROM linktree_template_key_renames rename
 WHERE linktree.template_config->>'template_key' = rename.old_key;

ALTER TABLE public.business_defaults
  ALTER COLUMN template_key SET DEFAULT 'spectrum';

ALTER TABLE public.linktrees
  ALTER COLUMN template_key SET DEFAULT 'spectrum';
