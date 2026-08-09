import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { MINI_WEBSITE_SECTIONS } from "@/features/mini-website/types";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import { MULTITREE_MINI_WEBSITE_PREVIEW } from "../../preview-data";
import {
  SECTION_REGISTRY,
  sectionHeaderTone,
  sectionPlacementClass,
  type SectionRegistryContext,
} from "./registry";
import {
  ADVANTAGE_TONES,
  IMPACT_STAT_TONES,
  PROCESS_TONES,
} from "../LiquidGlassInformationalSections";
import {
  EDUCATION_TONES,
  EXPERIENCE_TONES,
  SERVICE_CARD_TONES,
  TEAM_TONES,
} from "./section-tokens";

describe("section registry", () => {
  beforeAll(() => {
    window.IntersectionObserver = class {
      private callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(element: Element) {
        this.callback(
          [{ isIntersecting: true, target: element }] as IntersectionObserverEntry[],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });

  it("covers every section the picker offers", () => {
    const registered = Object.keys(SECTION_REGISTRY);
    for (const section of MINI_WEBSITE_SECTIONS) {
      if (section.key === "stories") continue;
      expect(registered).toContain(section.key);
    }
  });

  it("gives every entry its label, icon, palette, placement and renderer", () => {
    for (const [key, entry] of Object.entries(SECTION_REGISTRY)) {
      expect(entry.label, key).toBeTruthy();
      expect(entry.icon, key).toBeTruthy();
      expect(Array.isArray(entry.palette), key).toBe(true);
      expect(["full", "half"], key).toContain(entry.placement);
      expect(typeof entry.render, key).toBe("function");
    }
  });

  it("heads palette sections in their first tone and the rest in the accent", () => {
    expect(sectionHeaderTone("whyChooseUs")).toBe(ADVANTAGE_TONES[0]);
    expect(sectionHeaderTone("impactStats")).toBe(IMPACT_STAT_TONES[0]);
    expect(sectionHeaderTone("process")).toBe(PROCESS_TONES[0]);
    expect(sectionHeaderTone("services")).toBe(SERVICE_CARD_TONES[0]);
    expect(sectionHeaderTone("experience")).toBe(EXPERIENCE_TONES[0]);
    expect(sectionHeaderTone("education")).toBe(EDUCATION_TONES[0]);
    expect(sectionHeaderTone("team")).toBe(TEAM_TONES[0]);
    expect(sectionHeaderTone("gallery")).toBe(SWISS_ACCENT);
    expect(sectionHeaderTone("unknown")).toBe(SWISS_ACCENT);
  });

  it("places concise sections on one column and the rest on the full row", () => {
    for (const key of ["offers", "booking", "events", "audio", "payments", "serviceAreas", "hours", "faq"]) {
      expect(sectionPlacementClass(key)).toBe("xl:col-span-1");
    }
    for (const key of ["services", "gallery", "reviews", "location", "team"]) {
      expect(sectionPlacementClass(key)).toBe("xl:col-span-2");
    }
    expect(sectionPlacementClass("unknown")).toBe("xl:col-span-2");
  });

  it("renders every section through its registry renderer", () => {
    const profile = MULTITREE_MINI_WEBSITE_PREVIEW;
    const brand = "rgb(138 201 38)";
    for (const [key, entry] of Object.entries(SECTION_REGISTRY)) {
      const ctx: SectionRegistryContext = {
        profile,
        fullPage: true,
        interactive: true,
        index: 0,
        accent: brand,
        common: { fullPage: true, accent: brand, tone: sectionHeaderTone(key), index: 0 },
        header: { title: entry.label, icon: entry.icon },
      };
      const node = entry.render(ctx);
      // Empty sections legitimately mount to nothing.
      if (node === null) continue;
      const { unmount } = render(<>{node}</>);
      unmount();
    }
  });

  it("renders the preview sections the template actually draws", () => {
    const profile = MULTITREE_MINI_WEBSITE_PREVIEW;
    const brand = "rgb(138 201 38)";
    render(
      <div data-registry-smoke>
        {profile.sections
          .filter((section) => section.enabled)
          .map((section) => {
            const entry = SECTION_REGISTRY[section.key];
            if (!entry) return null;
            return (
              <div key={section.key} data-registry-section={section.key}>
                {entry.render({
                  profile,
                  fullPage: true,
                  interactive: true,
                  index: 0,
                  accent: brand,
                  common: {
                    fullPage: true,
                    accent: brand,
                    tone: sectionHeaderTone(section.key),
                    index: 0,
                  },
                  header: { title: entry.label, icon: entry.icon },
                })}
              </div>
            );
          })}
      </div>,
    );
    expect(
      screen.getByText("سۆشیال میدیا"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("بۆچی ئێمە هەڵبژێریت؟"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("خزمەتگوزاری و بەرهەم"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ژمارە و کاریگەری"),
    ).toBeInTheDocument();
  });
});
