import { render, screen } from "@testing-library/react";
import { Star } from "lucide-react";
import { beforeAll, describe, expect, it } from "vitest";
import {
  AdvantagesSection,
  DocumentsSection,
  ImpactStatsSection,
  ProcessSection,
} from "./LiquidGlassInformationalSections";

const frame = {
  fullPage: false,
  accent: "#334155",
  title: "Section",
  icon: Star,
};

/** Kept in step with the palettes the three item lists cycle through. */
const ADVANTAGE_TONES = [
  "#0891b2",
  "#a16207",
  "#db2777",
  "#059669",
  "#b45309",
];
const PROCESS_TONES = ["#7e22ce", "#0369a1", "#4d7c0f", "#1e40af", "#115e59"];

/** Hue in degrees plus saturation, so a grey can be told from a colour. */
function hueAndSaturation(hex: string) {
  const [red, green, blue] = [1, 3, 5].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const span = max - min;
  const lightness = (max + min) / 2;
  if (!span) return { hue: 0, saturation: 0 };
  const hue =
    max === red
      ? ((green - blue) / span + (green < blue ? 6 : 0)) * 60
      : max === green
        ? ((blue - red) / span + 2) * 60
        : ((red - green) / span + 4) * 60;
  return { hue, saturation: span / (1 - Math.abs(2 * lightness - 1)) };
}

/**
 * Two tones look like the same colour when their hues are close and both are
 * saturated. A muted tone beside a saturated one always reads as different.
 *
 * Neighbours inside one list sit together, so they are held further apart than
 * the same slot of two lists, which a visitor scrolls past seconds apart. With
 * six lists the wheel is too tight to hold both at the same angle.
 */
const NEIGHBOUR_DEGREES = 45;
const SAME_SLOT_DEGREES = 40;

function looksAlike(first: string, second: string, limit = NEIGHBOUR_DEGREES) {
  const left = hueAndSaturation(first);
  const right = hueAndSaturation(second);
  if (left.saturation < 0.3 || right.saturation < 0.3) return false;
  const gap = Math.abs(left.hue - right.hue);
  return Math.min(gap, 360 - gap) < limit;
}
const SERVICE_CARD_TONES = [
  "#b91c1c",
  "#c026d3",
  "#15803d",
  "#831843",
  "#4338ca",
];
const IMPACT_STAT_TONES = [
  "#166534",
  "#be123c",
  "#155e75",
  "#92400e",
  "#a21caf",
];
const EXPERIENCE_TONES = [
  "#6b6b0f",
  "#15803d",
  "#a16207",
  "#7e22ce",
  "#2b6b2b",
];
const EDUCATION_TONES = [
  "#7a1a5e",
  "#4d7c0f",
  "#4338ca",
  "#2b6b2b",
  "#637a0f",
];
const TEAM_TONES = ["#317014", "#4338ca", "#871496", "#637a0f", "#be123c"];
const PALETTES = [
  ADVANTAGE_TONES,
  PROCESS_TONES,
  SERVICE_CARD_TONES,
  IMPACT_STAT_TONES,
  EXPERIENCE_TONES,
  EDUCATION_TONES,
  TEAM_TONES,
];

// The stat counter animates on scroll, so it asks jsdom for two APIs it does
// not implement. Stubbed here rather than in the shared setup file, which every
// other suite also loads.
beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("liquid-glass informational sections", () => {
  it("never repeats a colour at the same position across the item lists", () => {
    for (const palette of PALETTES) {
      expect(palette).toHaveLength(ADVANTAGE_TONES.length);
    }
    ADVANTAGE_TONES.forEach((_tone, position) => {
      const atPosition = PALETTES.map((palette) => palette[position]);
      const collisions = atPosition.flatMap((tone, index) =>
        atPosition
          .slice(index + 1)
          .filter((other) => looksAlike(tone, other, SAME_SLOT_DEGREES))
          .map((other) => `${tone} vs ${other} at position ${position}`),
      );
      expect(collisions).toEqual([]);
    });
  });

  it("keeps neighbouring items inside one list visibly apart", () => {
    for (const tones of PALETTES) {
      // The lists cycle, so the last item sits beside the first one again.
      const neighbours = tones.map((tone, index) => [
        tone,
        tones[(index + 1) % tones.length],
      ]);
      expect(
        neighbours.filter(([tone, next]) => looksAlike(tone, next)),
      ).toEqual([]);
    }
  });

  it("preserves advantage filtering and gives each visible icon its own tone", () => {
    const { container } = render(
      <AdvantagesSection
        {...frame}
        items={[
          { id: "blank", title: "", description: "", icon: "check" },
          {
            id: "trusted",
            title: "Trusted",
            description: "Verified work",
            icon: "shield",
          },
          {
            id: "fast",
            title: "Fast",
            description: "Quick response",
            icon: "zap",
          },
        ]}
      />,
    );
    expect(screen.getByText("Trusted")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();
    expect(screen.queryByText("blank")).not.toBeInTheDocument();
    const iconTones = Array.from(
      container.querySelectorAll<HTMLElement>("[data-mini-advantage-icon]"),
      (icon) => icon.style.color,
    );
    expect(iconTones).toHaveLength(2);
    expect(new Set(iconTones).size).toBe(2);
  });

  it("keeps preview process actions non-navigable", () => {
    render(
      <ProcessSection
        {...frame}
        interactive={false}
        steps={[
          {
            id: "one",
            title: "Start",
            description: "First step",
            icon: "check",
            actionLabel: "Open",
            actionUrl: "https://example.com/start",
          },
        ]}
      />,
    );
    expect(screen.getByText("Open").closest("a")).not.toHaveAttribute("href");
  });

  it("gives each visible process step its own tone", () => {
    const { container } = render(
      <ProcessSection
        {...frame}
        interactive
        steps={[
          {
            id: "blank",
            title: "",
            description: "",
            icon: "check",
            actionLabel: "",
            actionUrl: "",
          },
          {
            id: "one",
            title: "Start",
            description: "First",
            icon: "check",
            actionLabel: "",
            actionUrl: "",
          },
          {
            id: "two",
            title: "Finish",
            description: "Last",
            icon: "zap",
            actionLabel: "",
            actionUrl: "",
          },
        ]}
      />,
    );
    const stepTones = Array.from(
      container.querySelectorAll<HTMLElement>("[data-mini-process-step]"),
      (step) => step.style.color,
    );
    expect(stepTones).toHaveLength(2);
    expect(new Set(stepTones).size).toBe(2);
  });

  it("gives each visible impact stat its own tone", () => {
    const { container } = render(
      <ImpactStatsSection
        {...frame}
        items={[
          { id: "blank", value: "", label: "", suffix: "", icon: "check" },
          {
            id: "clients",
            value: "120",
            label: "کڕیار",
            suffix: "+",
            icon: "users",
          },
          {
            id: "years",
            value: "8",
            label: "ساڵ",
            suffix: "",
            icon: "award",
          },
        ]}
      />,
    );
    const tones = Array.from(
      container.querySelectorAll<HTMLElement>("[data-mini-impact-icon]"),
      (icon) => icon.style.color,
    );
    expect(tones).toHaveLength(2);
    expect(new Set(tones).size).toBe(2);
  });

  it("does not render unsafe document URLs", () => {
    const { container } = render(
      <DocumentsSection
        {...frame}
        interactive
        documents={[
          {
            id: "unsafe",
            title: "Unsafe",
            description: "",
            fileUrl: "javascript:alert(1)",
            fileType: "PDF",
            fileSize: "1 MB",
          },
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
