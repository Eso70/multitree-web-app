-- Retires the Soft Horizon mini-website template. Liquid Glass becomes the only
-- visual template, and therefore also the only default.
--
-- Every persisted selection moves rather than being cleared, so a mini website
-- that was on Soft Horizon keeps rendering — as Liquid Glass — instead of
-- failing its template lookup. `MiniWebsiteTemplateRenderer` ignores the key
-- entirely now, so a row that somehow escapes this still renders.
--
-- The catalog rows go too: a plan that grants a template nobody can select only
-- shows an option the editor no longer offers.
--
-- Idempotent: a second run matches nothing.

ALTER TABLE public.mini_websites
  DROP CONSTRAINT IF EXISTS mini_websites_template_key_check;

UPDATE public.mini_websites
   SET template_key = 'liquid-glass',
       updated_at = now()
 WHERE template_key <> 'liquid-glass';

ALTER TABLE public.mini_websites
  ADD CONSTRAINT mini_websites_template_key_check CHECK (
    template_key IN ('liquid-glass')
  );

DELETE FROM public.billing_plan_templates
 WHERE template_key = 'soft-horizon';

DELETE FROM public.template_global_settings
 WHERE template_key = 'soft-horizon';

-- Liquid Glass must be granted everywhere now that it is the only option;
-- otherwise a plan whose only mini-website grant was Soft Horizon would be left
-- with none at all.
INSERT INTO public.billing_plan_templates (
  plan_configuration_id,
  template_key,
  created_at
)
SELECT configuration.id, 'liquid-glass', now()
  FROM public.billing_plan_configurations configuration
  JOIN public.billing_plans plan ON plan.id = configuration.plan_id
 WHERE plan.status = 'active'
ON CONFLICT (plan_configuration_id, template_key) DO NOTHING;
