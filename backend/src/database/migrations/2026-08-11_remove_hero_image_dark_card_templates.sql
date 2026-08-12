-- Remove "Hero Image" and "Dark Card" templates from the billing plan
-- template catalog. No businesses currently use either template.

DELETE FROM public.billing_plan_templates
 WHERE template_key IN ('hero-image', 'dark-card');
