import type { PoolClient } from 'pg';
import { inTransaction } from '../src/database/migration-transaction';

/** Idempotent API-platform seed/default data. Schema is owned by migrations. */
const API_PLATFORM_DATA_SQL = `
DELETE FROM public.api_versions
 WHERE (version = 'v2' AND released_at = '2026-06-10')
    OR (version = 'v0' AND released_at = '2024-04-01');
INSERT INTO public.api_versions(version, status, released_at, retirement_at)
VALUES ('v1', 'supported', '2026-07-20', NULL)
ON CONFLICT (version) DO NOTHING;
UPDATE public.api_versions
   SET released_at = '2026-07-20', retirement_at = NULL, updated_at = now()
 WHERE version = 'v1' AND released_at = '2025-02-18';
UPDATE public.api_versions
   SET status = 'current', retirement_at = NULL, updated_at = now()
 WHERE version = 'v1'
   AND NOT EXISTS (SELECT 1 FROM public.api_versions WHERE status = 'current');

INSERT INTO public.billing_plan_entitlements(plan_configuration_id, entitlement_id, value)
SELECT configuration.id, entitlement.id,
       CASE entitlement.entitlement_key
         WHEN 'feature.api_access' THEN to_jsonb(plan.code IN ('pro','ultra'))
         WHEN 'feature.webhooks' THEN to_jsonb(plan.code IN ('pro','ultra'))
         WHEN 'limit.api_requests_monthly' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 200000 WHEN 'pro' THEN 50000 ELSE 0 END)
         WHEN 'limit.api_clients' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 10 WHEN 'pro' THEN 3 ELSE 0 END)
         WHEN 'limit.webhook_endpoints' THEN to_jsonb(CASE plan.code WHEN 'ultra' THEN 10 WHEN 'pro' THEN 3 ELSE 0 END)
       END
FROM public.billing_plan_configurations configuration
JOIN public.billing_plans plan ON plan.id = configuration.plan_id
CROSS JOIN public.billing_entitlements entitlement
WHERE entitlement.entitlement_key IN ('feature.api_access','feature.webhooks','limit.api_requests_monthly','limit.api_clients','limit.webhook_endpoints')
ON CONFLICT (plan_configuration_id, entitlement_id) DO NOTHING;

INSERT INTO public.api_catalog_groups (id, name, description, scope_expression, endpoint_count, operations, enabled, display_order)
VALUES
  ('linktrees', 'Public Linktrees', 'Create and manage public Linktree pages.', 'linktrees:read / linktrees:write', 8, '["List","Create","View","Update","Publish","Unpublish","Delete"]', true, 10),
  ('links', 'Links & Ordering', 'Manage links and their display order.', 'links:read / links:manage', 2, '["List","Synchronize and reorder"]', true, 20),
  ('assets', 'Assets & Media', 'Upload and manage public page assets.', 'assets:read / assets:write', 3, '["Upload","List","Delete"]', true, 30),
  ('slugs', 'Slugs & Preview', 'Check slugs and preview unpublished changes.', 'linktrees:read / linktrees:write', 2, '["Check availability","Preview"]', true, 40),
  ('scheduling', 'Scheduling & Campaigns', 'Schedule publishing and unpublishing.', 'schedules:read / schedules:write', 3, '["Schedule","List","Cancel"]', true, 50),
  ('templates', 'Templates & Cloning', 'List allowed templates and clone existing pages.', 'templates:read / linktrees:write', 2, '["List templates","Clone"]', true, 60),
  ('bulk', 'Bulk Operations', 'Manage multiple pages atomically.', 'bulk:write', 1, '["Bulk create and update"]', true, 70),
  ('analytics', 'Analytics & Exports', 'Read analytics and export reports.', 'analytics:read / analytics:export', 4, '["Summary","Daily","Range","CSV export"]', true, 80)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  scope_expression = EXCLUDED.scope_expression,
  endpoint_count = EXCLUDED.endpoint_count, operations = EXCLUDED.operations,
  display_order = EXCLUDED.display_order, updated_at = now();
`;

export async function ensureApiPlatform(client: PoolClient): Promise<void> {
  await inTransaction(client, async () => {
    await client.query(API_PLATFORM_DATA_SQL);
  });
}
