/**
 * A linktree page may carry a repeating background pattern, kept in
 * `template_config.background_pattern` alongside `background_image`. It is
 * presentation the template renderer reads, so it needs no column of its own.
 *
 * The value selects an SVG the public page draws, so anything outside the
 * catalogue is dropped rather than stored: an unknown key would render nothing
 * and leave the owner with a setting that silently does not apply.
 *
 * Mirrors `BACKGROUND_PATTERN_STYLES` in `@linktree/types`, which the picker
 * and both renderers read. `linktree-background-pattern.spec.ts` asserts the
 * copy matches — the shared package is source-only and Node cannot resolve it
 * at runtime.
 */

export const BACKGROUND_PATTERN_CONFIG_KEY = 'background_pattern';

export const LINKTREE_BACKGROUND_PATTERNS = [
  'none',
  'grid',
  'grid45',
  'dots',
  'diagonal',
  'cross',
  'circles',
  'waves',
  'zigzag',
] as const;

export type LinktreeBackgroundPattern =
  (typeof LINKTREE_BACKGROUND_PATTERNS)[number];

export function isLinktreeBackgroundPattern(
  value: unknown,
): value is LinktreeBackgroundPattern {
  return (
    typeof value === 'string' &&
    (LINKTREE_BACKGROUND_PATTERNS as readonly string[]).includes(value)
  );
}
