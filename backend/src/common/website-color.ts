/**
 * The one accepted shape of a stored page colour.
 *
 * `#rgb`, `#rrggbb`, or `gradient:<direction>:<hex>:<hex>` — the same rule the
 * browser's `parseWebsiteColor` reads back, because every one of these values
 * is rendered as an inline CSS background. Four hand-written copies of this
 * regex had drifted apart: two accepted `#abcd`, which is not a colour any
 * browser draws; one accepted six digits only, which rejected a shorthand the
 * colour picker could produce; and the linktree background accepted any string
 * at all. Validate against this constant rather than writing a fifth.
 */
export const WEBSITE_COLOR_PATTERN =
  /^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|gradient:(?:to-r|to-l|to-b|to-t|to-br|to-bl|to-tr|to-tl|radial):#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}):#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))$/;

/** Longest value the pattern can match, for a companion length bound. */
export const WEBSITE_COLOR_MAX_LENGTH = 40;

export function isWebsiteColor(value: string): boolean {
  return WEBSITE_COLOR_PATTERN.test(value);
}
