import * as fc from 'fast-check';
import { parseWebsiteColor, formatWebsiteColor, type ParsedColor } from './parse-website-color';

/**
 * Property 1: Color Parser Round-Trip
 * **Validates: Requirements 2.1, 2.2, 2.4**
 *
 * For any valid website_color string (hex or gradient), parsing it with parseWebsiteColor
 * and then formatting back with formatWebsiteColor SHALL produce a string that,
 * when parsed again, yields an equivalent ParsedColor object.
 */
describe('Feature: business-website-color-theming, Property 1: Color Parser Round-Trip', () => {
  // Valid gradient directions
  const VALID_DIRECTIONS = ['to-r', 'to-l', 'to-b', 'to-t', 'to-br', 'to-bl', 'to-tr', 'to-tl', 'radial'] as const;

  // Arbitrary for a single hex digit
  const hexDigit = fc.oneof(
    fc.integer({ min: 0, max: 9 }).map((n) => n.toString()),
    fc.integer({ min: 0, max: 5 }).map((n) => String.fromCharCode(97 + n)), // a-f
    fc.integer({ min: 0, max: 5 }).map((n) => String.fromCharCode(65 + n)), // A-F
  );

  // Arbitrary for #RRGGBB hex colors
  const hex6Arbitrary = fc
    .tuple(hexDigit, hexDigit, hexDigit, hexDigit, hexDigit, hexDigit)
    .map(([a, b, c, d, e, f]) => `#${a}${b}${c}${d}${e}${f}`);

  // Arbitrary for #RGB hex colors
  const hex3Arbitrary = fc
    .tuple(hexDigit, hexDigit, hexDigit)
    .map(([a, b, c]) => `#${a}${b}${c}`);

  // Arbitrary for valid hex colors (either #RGB or #RRGGBB)
  const hexColorArbitrary = fc.oneof(hex3Arbitrary, hex6Arbitrary);

  // Arbitrary for gradient direction
  const directionArbitrary = fc.constantFrom(...VALID_DIRECTIONS);

  // Arbitrary for valid gradient strings: gradient:{direction}:{hexColor}:{hexColor}
  // Use only 3 or 6 digit hex colors for from/to
  const gradientArbitrary = fc
    .tuple(directionArbitrary, hexColorArbitrary, hexColorArbitrary)
    .map(([dir, from, to]) => `gradient:${dir}:${from}:${to}`);

  // Combined arbitrary for any valid website color input
  const validColorArbitrary = fc.oneof(hexColorArbitrary, gradientArbitrary);

  /**
   * Helper to compare two ParsedColor objects for equivalence.
   * We compare type, css, and primary fields (raw may differ in casing).
   */
  function parsedColorsEquivalent(a: ParsedColor, b: ParsedColor): boolean {
    return a.type === b.type && a.css === b.css && a.primary === b.primary;
  }

  it('parse → format → parse produces equivalent ParsedColor for any valid hex color', () => {
    fc.assert(
      fc.property(hexColorArbitrary, (input: string) => {
        const firstParse = parseWebsiteColor(input);
        const formatted = formatWebsiteColor(firstParse);
        const secondParse = parseWebsiteColor(formatted);
        const thirdParse = parseWebsiteColor(formatWebsiteColor(secondParse));

        // The round-trip should produce an equivalent ParsedColor
        expect(parsedColorsEquivalent(secondParse, firstParse)).toBe(true);
        expect(parsedColorsEquivalent(thirdParse, firstParse)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('parse → format → parse produces equivalent ParsedColor for any valid gradient string', () => {
    fc.assert(
      fc.property(gradientArbitrary, (input: string) => {
        const firstParse = parseWebsiteColor(input);
        const formatted = formatWebsiteColor(firstParse);
        const secondParse = parseWebsiteColor(formatted);
        const thirdParse = parseWebsiteColor(formatWebsiteColor(secondParse));

        // The round-trip should produce an equivalent ParsedColor
        expect(parsedColorsEquivalent(secondParse, firstParse)).toBe(true);
        expect(parsedColorsEquivalent(thirdParse, firstParse)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('parse → format → parse produces equivalent ParsedColor for any valid color (hex or gradient)', () => {
    fc.assert(
      fc.property(validColorArbitrary, (input: string) => {
        const firstParse = parseWebsiteColor(input);
        const formatted = formatWebsiteColor(firstParse);
        const secondParse = parseWebsiteColor(formatted);
        const thirdParse = parseWebsiteColor(formatWebsiteColor(secondParse));

        // The round-trip property: parseWebsiteColor(formatWebsiteColor(parseWebsiteColor(input)))
        // produces equivalent ParsedColor to parseWebsiteColor(input)
        expect(parsedColorsEquivalent(secondParse, firstParse)).toBe(true);
        expect(parsedColorsEquivalent(thirdParse, firstParse)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 2: Invalid Color Format Fallback
 * **Validates: Requirements 2.3**
 *
 * For any string that does not match either the hex color pattern (#RGB or #RRGGBB)
 * or the gradient format (gradient:direction:from:to), parseWebsiteColor SHALL return
 * a ParsedColor with primary equal to '#000000' and type equal to 'solid'.
 */
describe('Feature: business-website-color-theming, Property 2: Invalid Color Format Fallback', () => {
  const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const GRADIENT_PATTERN = /^gradient:([\w-]+):(#[0-9a-fA-F]{3,6}):(#[0-9a-fA-F]{3,6})$/;

  it('should return default fallback (primary=#000000, type=solid) for any string that is not a valid hex or gradient format', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          const trimmed = s.trim();
          // Exclude empty/whitespace-only strings (they also fall back but are a separate edge case)
          if (!trimmed) return false;
          // Exclude valid hex patterns
          if (HEX_PATTERN.test(trimmed)) return false;
          // Exclude valid gradient patterns
          if (GRADIENT_PATTERN.test(trimmed)) return false;
          return true;
        }),
        (invalidInput) => {
          const result = parseWebsiteColor(invalidInput);
          expect(result.primary).toBe('#000000');
          expect(result.type).toBe('solid');
        },
      ),
      { numRuns: 100 },
    );
  });
});
