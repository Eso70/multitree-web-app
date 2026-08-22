/**
 * The cached copies of one root-domain public Linktree.
 *
 * Root-domain pages — the platform's own and every Creator's — are read through
 * `getPlatformPublicLinktree`, which caches the rendered body under the slug or
 * uid the visitor asked for, for two hours. That is a different key space from
 * the `cache:linktree:uid:*` entries a business subdomain uses, so the
 * subdomain purge on an ordinary Linktree write does not touch it: an owner who
 * edited a root-domain page without renaming it kept serving the old copy until
 * the entry expired.
 *
 * A rename or a delete is already safe — `root_public_slugs` no longer maps the
 * old slug, so the read fails its owner check before it reaches the cache. It
 * is the edit-in-place that needs this.
 *
 * Every writer of a root-domain page purges these keys. Shared here so a second
 * writer cannot invent its own key format and silently miss them.
 */
export function rootPublicLinktreeCacheKeys(
  ...identifiers: Array<string | null | undefined>
): string[] {
  return [
    ...new Set(
      identifiers
        .map((value) => value?.trim())
        .filter((value): value is string => !!value),
    ),
  ].map((value) => `cache:platform-linktree:${value}`);
}
