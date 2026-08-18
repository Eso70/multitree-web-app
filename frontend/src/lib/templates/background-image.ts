/**
 * A page background may be an uploaded image instead of a colour. The URL is
 * kept in `template_config.background_image` because `linktrees.background_color`
 * is `varchar(50)` and cannot hold an upload path.
 *
 * The value is owner-controlled and ends up in a CSS `background-image` on a
 * public page, so it is validated on every read: only same-origin upload paths
 * are accepted. An external URL would make every anonymous visitor issue a
 * third-party request, and a quote or parenthesis would break out of `url()`.
 * Mirrors isLinktreeBackgroundImage in
 * backend/src/common/linktree-background-image.ts.
 */

export const BACKGROUND_IMAGE_CONFIG_KEY = "background_image";

/** Upload paths returned by the backend storage service. */
const UPLOADED_BACKGROUND_IMAGE = /^\/images\/upload\/[A-Za-z0-9._\-/]+$/;
/** A traversal segment would leave the upload namespace the prefix promises. */
const TRAVERSAL_SEGMENT = /(^|\/)\.\.(\/|$)/;

export function isBackgroundImageUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UPLOADED_BACKGROUND_IMAGE.test(value) &&
    !TRAVERSAL_SEGMENT.test(value)
  );
}

/** The background image stored in a template config, or null when unusable. */
export function readBackgroundImage(
  templateConfig: unknown,
): string | null {
  if (!templateConfig || typeof templateConfig !== "object" || Array.isArray(templateConfig)) {
    return null;
  }

  const value = (templateConfig as Record<string, unknown>)[BACKGROUND_IMAGE_CONFIG_KEY];
  return isBackgroundImageUrl(value) ? value : null;
}

/** The `background` shorthand that paints a validated upload full-bleed. */
export function backgroundImageCss(url: string): string {
  return `url("${url}") center / cover no-repeat`;
}
