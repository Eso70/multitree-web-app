/**
 * The Google profile-photo locations `next/image` is configured to load.
 *
 * `next.config.ts` builds its `remotePatterns` from this list, so the runtime
 * guard below and the loader's allowlist cannot drift apart.
 */
export const GOOGLE_AVATAR_PATTERNS = [
  { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a/**" },
  { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a-/**" },
] as const;

/**
 * The avatar URL to hand `next/image`, or `null` to fall back to a placeholder.
 *
 * `users.avatar_url` is whatever Google put in the `picture` claim, stored
 * verbatim. `next/image` **throws** for a `src` outside its configured
 * `remotePatterns` — it does not degrade — so one account whose photo sits on
 * another host or path took the whole dashboard, settings page, or admin users
 * table to the error boundary. Ask here before rendering; a value this rejects
 * is not an error, just a photo to draw the placeholder for instead.
 *
 * Same-origin paths (`/images/upload/...`) pass through: the loader serves
 * those without an allowlist.
 */
export function remoteAvatarSrc(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const allowed = GOOGLE_AVATAR_PATTERNS.some(
    (pattern) =>
      url.protocol === `${pattern.protocol}:` &&
      url.hostname === pattern.hostname &&
      url.pathname.startsWith(pattern.pathname.replace("**", "")),
  );
  return allowed ? value : null;
}
