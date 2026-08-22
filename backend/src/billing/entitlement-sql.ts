/**
 * Whether a business's plan *currently* carries a boolean entitlement.
 *
 * A SQL fragment rather than a service call because every caller needs it
 * inside a larger query — public reads, the public business payload, the
 * migration seeds — and a hand-written copy in each is how one of them quietly
 * starts disagreeing with the others.
 *
 * Why this is re-evaluated on every public read rather than trusted from
 * whenever the page was published: a `status = 'published'` column records what
 * the owner chose while they still had the feature, and nothing rewrites it
 * when the plan changes. Without a live check, downgrading leaves paid public
 * surfaces online that the business can no longer open, edit, or take down.
 *
 * Correlates on `<alias>.id`, so the query must expose a `businesses` alias.
 */
/**
 * Rejects anything that is not a bare SQL identifier.
 *
 * These fragments are interpolated, not parameterised: they are composed into
 * larger statements whose placeholder numbering the caller owns. Every caller
 * passes a compile-time constant today, and this is what keeps that true — a
 * fragment builder that skips the check is one refactor away from splicing a
 * column name that came from a request.
 */
function assertSqlAlias(alias: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    throw new Error(`Unsafe SQL alias: ${alias}`);
  }
}

/** As {@link assertSqlAlias}, allowing one `alias.column` qualification. */
function assertSqlColumn(column: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(column)) {
    throw new Error(`Unsafe SQL column: ${column}`);
  }
}

export function entitledSql(
  entitlementKey: string,
  businessAlias = 'business',
): string {
  // Every key is a compile-time constant from ENTITLEMENT below, never user
  // input; see assertSqlAlias for why that is checked rather than assumed.
  if (!/^[a-z0-9_.]+$/.test(entitlementKey)) {
    throw new Error(`Unsafe entitlement key: ${entitlementKey}`);
  }
  assertSqlAlias(businessAlias);
  return `EXISTS (
    SELECT 1
      FROM public.business_subscriptions subscription
      JOIN public.billing_entitlements entitlement
        ON entitlement.entitlement_key = '${entitlementKey}'
       -- Retired entitlements carry no grant. Every other reader of this
       -- catalog -- effective access, the public business payload, the plan
       -- editor -- filters on status, and this fragment did not: an
       -- entitlement a platform administrator deactivated kept the paid public
       -- surface serving and the Events API forwarding, while every dashboard
       -- reported the feature as gone.
       AND entitlement.status = 'active'
      JOIN public.billing_plan_entitlements plan_value
        ON plan_value.plan_configuration_id = subscription.plan_configuration_id
       AND plan_value.entitlement_id = entitlement.id
     WHERE subscription.business_id = ${businessAlias}.id
       AND subscription.status IN ('trialing','active','grace_period')
       AND plan_value.value = 'true'::jsonb
  )`;
}

/** Boolean entitlements that gate a public surface. */
export const ENTITLEMENT = {
  advertisingPage: 'feature.advertising_page',
  miniWebsites: 'feature.mini_websites',
  removeBranding: 'feature.remove_branding',
  tiktok: 'feature.tiktok',
} as const;

/**
 * The template every plan includes, used when a page still names one the plan
 * no longer carries.
 */
export const FALLBACK_TEMPLATE_KEY = 'spectrum';

/**
 * A page's template key, downgraded to the free default when the plan no longer
 * includes the one it was saved with.
 *
 * Templates are checked against `billing_plan_templates` when they are chosen,
 * but that choice is stored on the page and nothing rewrites it if the plan
 * changes later. Falling back here keeps a downgraded page online and readable
 * rather than either serving a premium design for free or taking the page down
 * over a styling question.
 */
export function allowedTemplateKeySql(
  templateColumn: string,
  businessAlias = 'business',
): string {
  assertSqlColumn(templateColumn);
  assertSqlAlias(businessAlias);
  return `CASE
    WHEN ${templateColumn} IS NULL THEN NULL
    WHEN EXISTS (
      SELECT 1
        FROM public.business_subscriptions subscription
        JOIN public.billing_plan_templates plan_template
          ON plan_template.plan_configuration_id = subscription.plan_configuration_id
         AND plan_template.template_key = ${templateColumn}
       WHERE subscription.business_id = ${businessAlias}.id
         AND subscription.status IN ('trialing','active','grace_period')
    ) THEN ${templateColumn}
    ELSE '${FALLBACK_TEMPLATE_KEY}'
  END`;
}
