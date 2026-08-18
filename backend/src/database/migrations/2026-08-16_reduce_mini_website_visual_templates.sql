-- Retire the three Liquid-derived layouts and migrate every existing choice to
-- the single independent Side Profile template. Liquid remains the default.
ALTER TABLE public.mini_websites
  ADD COLUMN IF NOT EXISTS template_key character varying(50)
  DEFAULT 'liquid-glass' NOT NULL;

ALTER TABLE public.mini_websites
  DROP CONSTRAINT IF EXISTS mini_websites_template_key_check;

UPDATE public.mini_websites
   SET template_key = 'side-profile'
 WHERE template_key IN ('editorial', 'business-pro', 'sidebar-canvas');

ALTER TABLE public.mini_websites
  ADD CONSTRAINT mini_websites_template_key_check CHECK (
    template_key IN ('liquid-glass', 'side-profile')
  );

DELETE FROM public.billing_plan_templates
 WHERE template_key IN ('editorial', 'business-pro', 'sidebar-canvas');

DELETE FROM public.template_global_settings
 WHERE template_key IN ('editorial', 'business-pro', 'sidebar-canvas');

INSERT INTO public.billing_plan_templates (
  plan_configuration_id,
  template_key,
  created_at
)
SELECT configuration.id, template.template_key, now()
  FROM public.billing_plan_configurations configuration
  JOIN public.billing_plans plan ON plan.id = configuration.plan_id
  CROSS JOIN unnest(ARRAY['liquid-glass', 'side-profile']::text[])
    AS template(template_key)
 WHERE plan.status = 'active'
ON CONFLICT (plan_configuration_id, template_key) DO NOTHING;
