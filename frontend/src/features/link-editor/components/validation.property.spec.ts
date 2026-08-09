import * as fc from 'fast-check';
import { validateBusinessName, validateSubdomain } from './BusinessInfoStep';
import { validateLinktreeName, validateSlug } from './LinktreePageStep';

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

  it('validateLinktreeName accepts iff input.trim().length >= 2', () => {
    fc.assert(
      fc.property(fc.string(), (input: string) => {
        const result = validateLinktreeName(input);
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

  it('validateSlug accepts iff non-empty input matches /^[a-z0-9-]+$/', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (input: string) => {
        const result = validateSlug(input);
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
});
