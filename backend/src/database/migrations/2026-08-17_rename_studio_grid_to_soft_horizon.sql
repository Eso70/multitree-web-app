-- Preserve every alternative-template selection while adopting the final,
-- customer-facing Soft Horizon identity.
ALTER TABLE public.mini_websites
  DROP CONSTRAINT IF EXISTS mini_websites_template_key_check;

UPDATE public.mini_websites
   SET template_key = 'soft-horizon'
 WHERE template_key IN (
   'studio-grid',
   'side-profile',
   'editorial',
   'business-pro',
   'sidebar-canvas'
 );

ALTER TABLE public.mini_websites
  ADD CONSTRAINT mini_websites_template_key_check CHECK (
    template_key IN ('liquid-glass', 'soft-horizon')
  );

DELETE FROM public.billing_plan_templates
 WHERE template_key IN (
   'studio-grid',
   'side-profile',
   'editorial',
   'business-pro',
   'sidebar-canvas'
 );

DELETE FROM public.template_global_settings
 WHERE template_key IN (
   'studio-grid',
   'side-profile',
   'editorial',
   'business-pro',
   'sidebar-canvas'
 );

INSERT INTO public.billing_plan_templates (
  plan_configuration_id,
  template_key,
  created_at
)
SELECT configuration.id, 'soft-horizon', now()
  FROM public.billing_plan_configurations configuration
  JOIN public.billing_plans plan ON plan.id = configuration.plan_id
 WHERE plan.status = 'active'
ON CONFLICT (plan_configuration_id, template_key) DO NOTHING;
