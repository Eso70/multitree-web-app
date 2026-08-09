import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import { DarkCardTemplate } from "../DarkCardTemplate";
import type { TemplateComponentProps } from "../types";
import type {
  LinktreePresentation as Linktree,
  LinktreePresentationLink as Link,
} from "@linktree/types";

/* eslint-disable @next/next/no-img-element */

// --- Mocks ---

// Mock next/image to render a regular <img>
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {

    const { src, alt, width, height, style, onError, ...rest } = props;
    return (
      <img
        src={src as string}
        alt={alt as string}
        width={width as number}
        height={height as number}
        style={style as React.CSSProperties}
        onError={onError as React.ReactEventHandler<HTMLImageElement>}
        {...rest}
      />
    );
  },
}));

// Mock motion/react.
//
// The stagger this suite checks lives in a `transition.delay` prop, which
// framer-motion applies over time rather than writing to the DOM — under jsdom
// there is nothing to read back. Rendering plain elements and forwarding the
// delay onto a data attribute makes the value assertable while leaving
// `style`, `className` and handlers exactly where the other properties expect
// them.
vi.mock("motion/react", () => {
  const passthrough = (tag: "button" | "div" | "span") => {
    const Component = ({
      children,
      transition,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      whileHover: _whileHover,
      whileTap: _whileTap,
      whileInView: _whileInView,
      viewport: _viewport,
      ...rest
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(
        tag,
        {
          ...rest,
          // The button staggers per animated property rather than with one
          // top-level delay, so fall back to the opacity track.
          "data-transition-delay": (() => {
            const t = transition as
              | { delay?: number; opacity?: { delay?: number } }
              | undefined;
            return t?.delay ?? t?.opacity?.delay;
          })(),
        },
        children as React.ReactNode,
      );
    Component.displayName = `motion.${tag}`;
    return Component;
  };
  return {
    motion: {
      button: passthrough("button"),
      div: passthrough("div"),
      span: passthrough("span"),
    },
    useReducedMotion: () => false,
  };
});

// Mock GpsLocationDisplay
vi.mock("@/components/public/GpsLocationDisplay", () => ({
  GpsLocationDisplay: () => <div data-testid="gps-display" />,
  splitGpsLinks: (links: Link[]) => {
    const gpsLink = links.find((l) => l.platform === "gps");
    const regularLinks = links.filter((l) => l.platform !== "gps");
    return { gpsLink, regularLinks };
  },
}));

// Track Footer props
let lastFooterProps: Record<string, unknown> = {};
vi.mock("@/components/public/Footer", () => ({
  Footer: (props: Record<string, unknown>) => {
    lastFooterProps = { ...props };
    return <div data-testid="footer" />;
  },
}));

// Mock getPlatformIcon but keep real getPlatformColors and getPlatformName
vi.mock("@/components/public/LinktreeButtons", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getPlatformIcon: (platform: string) => (
      <span data-testid={`icon-${platform}`} />
    ),
  };
});

// Mock areTemplatePropsEqual
vi.mock("@/lib/utils/linktree-utils", () => ({
  areTemplatePropsEqual: () => false,
}));

// --- Helpers ---

const KNOWN_PLATFORMS = [
  "whatsapp",
  "telegram",
  "viber",
  "phone",
  "instagram",
  "facebook",
  "twitter",
  "linkedin",
  "snapchat",
  "tiktok",
  "youtube",
  "discord",
  "email",
  "website",
  "custom",
] as const;

function makeLinktree(overrides: Partial<Linktree> = {}): Linktree {
  return {
    id: "lt-1",
    name: "Test Linktree",
    seo_name: "test-linktree",
    uid: "uid-1",
    background_color: "#000",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: "link-1",
    linktree_id: "lt-1",
    platform: "whatsapp",
    url: "https://wa.me/123",
    display_order: 0,
    click_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTheme(overrides: Partial<TemplateComponentProps["theme"]> = {}) {
  return {
    from: "#1e293b",
    via: "#334155",
    to: "#1e1b4b",
    isSolid: false,
    ...overrides,
  };
}

// Arbitraries

const arbHexColor = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  );

const arbThemeGradient = fc.record({
  from: arbHexColor,
  via: arbHexColor,
  to: arbHexColor,
  isSolid: fc.constant(false as const),
});

const arbNonEmptyName = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

const arbNonWhitespaceString = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const arbEmptySubtitle = fc.oneof(
  fc.constant(undefined as undefined),
  fc.constant(null as unknown as undefined),
  fc.constant(""),
  fc.constant("   "),
  fc.constant("  \t  "),
  fc.constant("\n\n"),
  fc.constant(" \t\n ")
);

const arbPlatform = fc.constantFrom(...KNOWN_PLATFORMS);

/**
 * Rewrites `#rrggbb` literals to the `rgb(r, g, b)` form jsdom emits when it
 * re-serializes an inline style, so brand colors declared as hex still compare
 * equal to what the DOM reports.
 */
function normalizeCssColors(value: string): string {
  return value.replace(/#([0-9a-f]{6})\b/gi, (_match, hex: string) => {
    const int = parseInt(hex, 16);
    return `rgb(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255})`;
  });
}

// --- Tests ---

describe("Feature: dark-card-template", () => {
  beforeEach(() => {
    lastFooterProps = {};
  });

  describe("Property 1: Background gradient reflects theme colors", () => {
    /**
     * Validates: Requirements 2.1
     */
    it("container inline style contains linear-gradient with from, via, to values", () => {
      // Helper to convert hex to rgb string as jsdom normalizes colors
      function hexToRgb(hex: string): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${r}, ${g}, ${b})`;
      }

      fc.assert(
        fc.property(arbThemeGradient, (theme) => {
          const { container } = render(
            <DarkCardTemplate
              linktree={makeLinktree()}
              links={[makeLink()]}
              theme={theme}
              onLinkClick={() => {}}
            />
          );

          const outerDiv = container.firstElementChild as HTMLElement;
          const styleAttr = outerDiv.getAttribute("style") || "";

          expect(styleAttr).toContain("linear-gradient");
          // jsdom normalizes hex colors to rgb() format
          expect(styleAttr).toContain(hexToRgb(theme.from));
          expect(styleAttr).toContain(hexToRgb(theme.via));
          expect(styleAttr).toContain(hexToRgb(theme.to));
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 2: Profile image alt matches linktree name", () => {
    /**
     * Validates: Requirements 3.4
     */
    it("img alt attribute equals the linktree name", () => {
      fc.assert(
        fc.property(arbNonEmptyName, (name) => {
          const { container } = render(
            <DarkCardTemplate
              linktree={makeLinktree({ name, image: "/test.png" })}
              links={[makeLink()]}
              theme={makeTheme()}
              onLinkClick={() => {}}
            />
          );

          const profileImg = container.querySelector("[data-template-avatar] img");
          expect(profileImg).toBeTruthy();
          expect(profileImg!.getAttribute("alt")).toBe(name);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 3: Non-empty subtitle renders as centered LTR tagline", () => {
    /**
     * Validates: Requirements 4.2
     */
    it("renders the subtitle as a centered header tagline", () => {
      fc.assert(
        fc.property(arbNonWhitespaceString, (subtitle) => {
          const { container } = render(
            <DarkCardTemplate
              linktree={makeLinktree({ subtitle })}
              links={[makeLink()]}
              theme={makeTheme()}
              onLinkClick={() => {}}
            />
          );

          // The component trims the subtitle before displaying
          const trimmed = subtitle.trim();

          // The subtitle is rendered as a centered tagline in the profile header.
          const paragraphs = container.querySelectorAll("p");
          const matching = Array.from(paragraphs).filter((p) => p.textContent?.includes(trimmed));
          const headerSubtitle = matching.find((p) => p.style.textAlign === "center");
          expect(headerSubtitle).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });

    it("renders the description as right-aligned LTR description-card text", () => {
      fc.assert(
        fc.property(arbNonWhitespaceString, (description) => {
          const { container } = render(
            <DarkCardTemplate
              linktree={makeLinktree({ description })}
              links={[makeLink()]}
              theme={makeTheme()}
              onLinkClick={() => {}}
            />
          );

          // The component trims the description before displaying
          const trimmed = description.trim();

          // The description is rendered as the right-aligned description-card text.
          const paragraphs = container.querySelectorAll("p");
          const matching = Array.from(paragraphs).filter((p) => p.textContent?.includes(trimmed));
          const descriptionText = matching.find((p) => p.style.textAlign === "right");
          expect(descriptionText).toBeTruthy();
          expect(descriptionText!.parentElement?.parentElement?.style.direction).toBe("ltr");
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 4: Empty description produces Kurdish fallback text", () => {
    /**
     * Validates: Requirements 4.4
     */
    it("displays fallback Kurdish text when description is empty/null/whitespace", () => {
      const FALLBACK = "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە";

      fc.assert(
        fc.property(arbEmptySubtitle, (description) => {
          const { container } = render(
            <DarkCardTemplate
              linktree={makeLinktree({ description: description as string | undefined })}
              links={[makeLink()]}
              theme={makeTheme()}
              onLinkClick={() => {}}
            />
          );

          const paragraphs = container.querySelectorAll("p");
          const fallbackP = Array.from(paragraphs).find(
            (p) => p.textContent === FALLBACK
          );
          expect(fallbackP).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5: Button gradient matches platform colors", () => {
    /**
     * Validates: Requirements 5.1
     */
    it("each button background gradient uses getPlatformColors output", async () => {
      const { getPlatformColors } = await import(
        "@/components/public/LinktreeButtons"
      );

      fc.assert(
        fc.property(arbPlatform, (platform) => {
          const link = makeLink({ id: "link-p5", platform });
          const { container } = render(
            <DarkCardTemplate
              linktree={makeLinktree()}
              links={[link]}
              theme={makeTheme()}
              onLinkClick={() => {}}
            />
          );

          const colors = getPlatformColors(platform);
          const buttons = container.querySelectorAll("button");
          // Find the link button (not other buttons)
          const linkButton = Array.from(buttons).find(
            (btn) => btn.style.background.includes("linear-gradient")
          );
          expect(linkButton).toBeTruthy();
          // jsdom re-serializes colors inside the gradient, so hex brand colors
          // come back as rgb(). Normalize both sides before comparing.
          const background = normalizeCssColors(linkButton!.style.background);
          expect(background).toContain(normalizeCssColors(colors.from));
          expect(background).toContain(normalizeCssColors(colors.via));
          expect(background).toContain(normalizeCssColors(colors.to));
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 6: Button label falls back to platform name", () => {
    /**
     * Validates: Requirements 5.2
     */
    it("label equals display_name when non-empty, otherwise getPlatformName result", async () => {
      const { getPlatformName } = await import(
        "@/components/public/LinktreeButtons"
      );

      fc.assert(
        fc.property(
          arbPlatform,
          fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
          (platform, displayName) => {
            const link = makeLink({
              id: "link-p6",
              platform,
              display_name: displayName,
            });
            const { container } = render(
              <DarkCardTemplate
                linktree={makeLinktree()}
                links={[link]}
                theme={makeTheme()}
                onLinkClick={() => {}}
              />
            );

            const buttons = container.querySelectorAll("button");
            const linkButton = Array.from(buttons).find((btn) =>
              btn.style.background.includes("linear-gradient")
            );
            expect(linkButton).toBeTruthy();

            const expectedLabel =
              displayName && displayName.length > 0
                ? displayName
                : getPlatformName(platform);
            // Get the label span - it's the one NOT used as a test-id icon mock
            const spans = linkButton!.querySelectorAll("span");
            const labelSpan = Array.from(spans).find(
              (s) => !s.hasAttribute("data-testid")
            );
            expect(labelSpan).toBeTruthy();
            expect(labelSpan!.textContent).toBe(expectedLabel);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 7: Button click invokes callback with correct arguments", () => {
    /**
     * Validates: Requirements 5.5
     */
    it("onLinkClick called with (id, url, platform, default_message)", () => {
      fc.assert(
        fc.property(
          arbPlatform,
          fc.webUrl(),
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
          (platform, url, defaultMessage) => {
            const onLinkClick = vi.fn();
            const linkId = "link-p7";
            const link = makeLink({
              id: linkId,
              platform,
              url,
              default_message: defaultMessage,
            });

            const { container } = render(
              <DarkCardTemplate
                linktree={makeLinktree()}
                links={[link]}
                theme={makeTheme()}
                onLinkClick={onLinkClick}
              />
            );

            const buttons = container.querySelectorAll("button");
            const linkButton = Array.from(buttons).find((btn) =>
              btn.style.background.includes("linear-gradient")
            );
            expect(linkButton).toBeTruthy();

            fireEvent.click(linkButton!);

            expect(onLinkClick).toHaveBeenCalledWith(
              linkId,
              url,
              platform,
              defaultMessage
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 8: Footer receives linktree footer fields", () => {
    /**
     * Validates: Requirements 7.2
     */
    it("Footer receives matching footerText and footerPhone props", () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          (footerText, footerPhone) => {
            render(
              <DarkCardTemplate
                linktree={makeLinktree({
                  footer_text: footerText,
                  footer_phone: footerPhone,
                })}
                links={[makeLink()]}
                theme={makeTheme()}
                onLinkClick={() => {}}
              />
            );

            expect(lastFooterProps.footerText).toBe(footerText);
            expect(lastFooterProps.footerPhone).toBe(footerPhone);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 9: Button animation delay is staggered by index", () => {
    /**
     * Validates: Requirements 8.1
     */
    it("button at index i is staggered by i*100ms", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            const links = Array.from({ length: count }, (_, i) =>
              makeLink({
                id: `link-${i}`,
                platform: KNOWN_PLATFORMS[i % KNOWN_PLATFORMS.length],
                display_order: i,
              })
            );

            const { container } = render(
              <DarkCardTemplate
                linktree={makeLinktree()}
                links={links}
                theme={makeTheme()}
                onLinkClick={() => {}}
              />
            );

            const buttons = container.querySelectorAll("button");
            const linkButtons = Array.from(buttons).filter((btn) =>
              btn.style.background.includes("linear-gradient")
            );

            expect(linkButtons.length).toBe(count);
            // 0.1s per index. Compared numerically because the product is
            // binary floating point: 3 * 0.1 is 0.30000000000000004.
            linkButtons.forEach((btn, i) => {
              const delay = Number(btn.getAttribute("data-transition-delay"));
              expect(delay).toBeCloseTo(i * 0.1, 10);
            });
          }
        ),
        { numRuns: 100 }
      );
    }, 10_000);
  });
});
