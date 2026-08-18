import {
  BACKGROUND_PATTERN_CONFIG_KEY as SHARED_CONFIG_KEY,
  BACKGROUND_PATTERN_DEFAULT,
  BACKGROUND_PATTERN_STYLES,
} from '@linktree/types';
import {
  BACKGROUND_PATTERN_CONFIG_KEY,
  LINKTREE_BACKGROUND_PATTERNS,
  isLinktreeBackgroundPattern,
} from './linktree-background-pattern';

/**
 * The backend copies the catalogue instead of importing it, because
 * `@linktree/types` is source-only and Node cannot resolve its extensionless
 * re-exports as ESM at runtime. ts-jest compiles to CommonJS, so the shared
 * values import cleanly here and the duplication is checked rather than
 * trusted.
 *
 * A drift means the editor offers a pattern the server strips on save, or the
 * server stores one no renderer can draw.
 */
describe('linktree background patterns mirrored from @linktree/types', () => {
  it('accepts exactly the patterns the shared catalogue declares', () => {
    expect([...LINKTREE_BACKGROUND_PATTERNS].sort()).toEqual(
      [...BACKGROUND_PATTERN_STYLES].sort(),
    );
  });

  it('reads the pattern from the same template_config key', () => {
    expect(BACKGROUND_PATTERN_CONFIG_KEY).toBe(SHARED_CONFIG_KEY);
  });

  it('accepts every catalogue value, including the default', () => {
    expect(isLinktreeBackgroundPattern(BACKGROUND_PATTERN_DEFAULT)).toBe(true);
    for (const pattern of BACKGROUND_PATTERN_STYLES) {
      expect(isLinktreeBackgroundPattern(pattern)).toBe(true);
    }
  });

  /**
   * A value outside the catalogue draws nothing, so storing it would leave the
   * owner with a setting that looks saved and never applies.
   */
  it('rejects anything outside the catalogue', () => {
    expect(isLinktreeBackgroundPattern('hexagons')).toBe(false);
    expect(isLinktreeBackgroundPattern('')).toBe(false);
    expect(isLinktreeBackgroundPattern(null)).toBe(false);
    expect(isLinktreeBackgroundPattern(undefined)).toBe(false);
    expect(isLinktreeBackgroundPattern(7)).toBe(false);
    expect(isLinktreeBackgroundPattern(['grid'])).toBe(false);
  });
});
