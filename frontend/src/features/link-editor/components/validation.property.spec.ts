import * as fc from 'fast-check';
import { validateBusinessName, validateSubdomain } from './BusinessInfoStep';
import {
  LINKTREE_NAME_MAX_LENGTH,
  validateLinktreeName,
  validateSlug,
} from './validation';

/**
 * Property 3: Name Field Minimum Length Validation
 * **Validates: Requirements 8.2, 9.2**
 *
 * For any string, the name validation function SHALL accept the string (return undefined)
 * if and only if string.trim().length >= 2. This applies uniformly to business name and linktree name.
 */
describe('Feature: business-website-color-theming, Property 3: Name Field Minimum Length Validation', () => {
  it('validateBusinessName accepts iff input.trim().length >= 2', () => {
    fc.assert(
      fc.property(fc.string(), (input: string) => {
        const result = validateBusinessName(input);
        const shouldBeValid = input.trim().length >= 2;

        if (shouldBeValid) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('validateLinktreeName accepts iff input.trim().length is between 2 and the name ceiling', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.string({ maxLength: LINKTREE_NAME_MAX_LENGTH + 20 })),
        (input: string) => {
        const result = validateLinktreeName(input);
        const trimmed = input.trim();
        const shouldBeValid =
          trimmed.length >= 2 && trimmed.length <= LINKTREE_NAME_MAX_LENGTH;

        if (shouldBeValid) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
        }
      },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 4: Slug/Subdomain Format Validation
 * **Validates: Requirements 8.3, 9.3**
 *
 * For any non-empty string, the slug/subdomain validation function SHALL accept the string
 * (return undefined) if and only if it matches the pattern /^[a-z0-9-]+$/.
 * This applies uniformly to business subdomain and linktree slug.
 */
describe('Feature: business-website-color-theming, Property 4: Slug/Subdomain Format Validation', () => {
  const SLUG_PATTERN = /^[a-z0-9-]+$/;

  it('validateSubdomain accepts iff non-empty input matches /^[a-z0-9-]+$/', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (input: string) => {
        const result = validateSubdomain(input);
        const shouldBeValid = SLUG_PATTERN.test(input);

        if (shouldBeValid) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * The linktree slug carries the extra length floor and ceiling that
   * `chk_lt_seo_name` and the column width impose; the business subdomain
   * above is format-only.
   */
  it('validateSlug accepts iff the trimmed input matches the pattern and fits the length bounds', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (input: string) => {
        const result = validateSlug(input);
        const trimmed = input.trim();
        const shouldBeValid =
          SLUG_PATTERN.test(trimmed) &&
          trimmed.length >= 2 &&
          trimmed.length <= LINKTREE_NAME_MAX_LENGTH;

        if (shouldBeValid) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBeDefined();
          expect(typeof result).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });
});
