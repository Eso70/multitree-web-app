import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { extractSubdomain } from "./subdomain-utils";

/**
 * Feature: subdomain-business-routing, Property 8: Subdomain Extraction Precedence
 * **Validates: Requirements 6.1**
 *
 * x-subdomain header takes priority over host parsing.
 */

// --- Arbitraries ---

/** Valid subdomain: lowercase alphanumeric + hyphens, no leading/trailing hyphens, no dots */
const arbSimpleSubdomain = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-".split("")), {
    minLength: 1,
    maxLength: 20,
  })
  .map((chars) => chars.join(""))
  .filter((s) => !s.startsWith("-") && !s.endsWith("-") && s.length >= 1);

/** Valid domain suffix (e.g., "kurdishsponser.cloud", "example.com") */
const arbDomainSuffix = fc.constantFrom(
  "kurdishsponser.cloud",
  "example.com",
  "test.org",
  "my-app.dev",
);

/** Host header with subdomain: {subdomain}.{domain}.{tld} (>2 parts) */
const arbHostWithSubdomain = fc
  .tuple(arbSimpleSubdomain, arbDomainSuffix)
  .map(([sub, suffix]) => `${sub}.${suffix}`);

/** Host header without subdomain: {domain}.{tld} (exactly 2 parts) */
const arbHostWithoutSubdomain = fc.constantFrom(
  "kurdishsponser.cloud",
  "example.com",
  "localhost.dev",
  "my-site.org",
);

/** Host header with only 1 part (e.g., "localhost") */
const arbHostSinglePart = fc.constantFrom(
  "localhost",
  "intranet",
  "myhost",
);

/** Host with ≤2 parts (no subdomain extractable from host) */
const arbHostNoSubdomain = fc.oneof(arbHostWithoutSubdomain, arbHostSinglePart);

// --- Property Tests ---

describe("Feature: subdomain-business-routing, Property 8: Subdomain Extraction Precedence", () => {
  it("extracts a localhost tenant when the configured root domain is provided", () => {
    expect(extractSubdomain("acme.localhost:3011", undefined, "localhost")).toBe("acme");
  });

  describe("8.1: x-subdomain header takes priority over host parsing", () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * For any host header H containing subdomain S AND x-subdomain header value X,
     * the extracted subdomain equals X (header priority).
     */
    it("extracted subdomain equals x-subdomain header value when both host and header are present", () => {
      fc.assert(
        fc.property(
          arbHostWithSubdomain,
          arbSimpleSubdomain,
          (host, xSubdomain) => {
            const result = extractSubdomain(host, xSubdomain);
            expect(result).toBe(xSubdomain);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("x-subdomain header takes priority even when host has no subdomain", () => {
      fc.assert(
        fc.property(
          arbHostNoSubdomain,
          arbSimpleSubdomain,
          (host, xSubdomain) => {
            const result = extractSubdomain(host, xSubdomain);
            expect(result).toBe(xSubdomain);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("8.2: Falls back to host parsing when x-subdomain header is absent", () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * When x-subdomain header is absent/empty, extracted subdomain equals
     * the first segment of host (if host has >2 parts).
     */
    it("extracts first segment from host when x-subdomain is undefined", () => {
      fc.assert(
        fc.property(
          arbSimpleSubdomain,
          arbDomainSuffix,
          (subdomain, suffix) => {
            const host = `${subdomain}.${suffix}`;
            const result = extractSubdomain(host, undefined);
            expect(result).toBe(subdomain);
          },
        ),
        { numRuns: 200 },
      );
    });

    it("extracts first segment from host when x-subdomain is empty string", () => {
      fc.assert(
        fc.property(
          arbSimpleSubdomain,
          arbDomainSuffix,
          (subdomain, suffix) => {
            const host = `${subdomain}.${suffix}`;
            // Empty string is falsy, so it should fall back to host parsing
            const result = extractSubdomain(host, "");
            expect(result).toBe(subdomain);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("8.3: Returns empty when no header and host has ≤2 parts", () => {
    /**
     * **Validates: Requirements 6.1**
     *
     * When x-subdomain header is absent AND host has ≤2 parts,
     * extracted subdomain is empty.
     */
    it("returns empty string for hosts with exactly 2 parts and no header", () => {
      fc.assert(
        fc.property(arbHostWithoutSubdomain, (host) => {
          const result = extractSubdomain(host, undefined);
          expect(result).toBe("");
        }),
        { numRuns: 100 },
      );
    });

    it("returns empty string for hosts with 1 part and no header", () => {
      fc.assert(
        fc.property(arbHostSinglePart, (host) => {
          const result = extractSubdomain(host, undefined);
          expect(result).toBe("");
        }),
        { numRuns: 100 },
      );
    });

    it("returns empty string for hosts with ≤2 parts when header is empty", () => {
      fc.assert(
        fc.property(arbHostNoSubdomain, (host) => {
          const result = extractSubdomain(host, "");
          expect(result).toBe("");
        }),
        { numRuns: 100 },
      );
    });
  });
});
