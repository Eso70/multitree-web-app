/**
 * A linktree background may be an uploaded image instead of a colour. The URL
 * is kept in `template_config.background_image` because
 * `linktrees.background_color` is `varchar(50)` and cannot hold an upload path.
 *
 * The value reaches a CSS `background-image` on a public page, so only
 * same-origin upload paths are accepted: an external URL would make every
 * anonymous visitor issue a third-party request, and a quote or parenthesis
 * would break out of `url()`. Mirrors isBackgroundImageUrl in
 * frontend/src/lib/templates/background-image.ts.
 */

export const BACKGROUND_IMAGE_CONFIG_KEY = 'background_image';

/** Upload paths returned by StorageService.uploadImage. */
const UPLOADED_BACKGROUND_IMAGE = /^\/images\/upload\/[A-Za-z0-9._\-/]+$/;
/** A traversal segment would leave the upload namespace the prefix promises. */
const TRAVERSAL_SEGMENT = /(^|\/)\.\.(\/|$)/;

export function isLinktreeBackgroundImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    UPLOADED_BACKGROUND_IMAGE.test(value) &&
    !TRAVERSAL_SEGMENT.test(value)
  );
}
