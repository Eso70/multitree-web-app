import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { MULTITREE_MINI_WEBSITE_PREVIEW } from "../preview-data";
import { LiquidGlassMiniWebsiteTemplate } from "./LiquidGlassMiniWebsiteTemplate";

describe("LiquidGlassMiniWebsiteTemplate", () => {
  // Sections below the fold mount lazily through an IntersectionObserver. The
  // shared setup file stubs it with an inert class that never fires, so drive
  // it here: every observed section is reported as immediately intersecting
  // and mounts after its skeleton's pending delay.
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

  it("places public theme and share controls after the hero", () => {
    const { container } = render(
      <LiquidGlassMiniWebsiteTemplate
        profile={{
          ...MULTITREE_MINI_WEBSITE_PREVIEW,
          sections: [],
          stories: [],
        }}
        fullPage
      />,
    );
    const controls = container.querySelector("[data-mini-controls]");

    expect(controls).toBeInTheDocument();
    expect(controls?.previousElementSibling).toHaveAttribute("data-mini-hero");
    expect(controls).toHaveClass("relative", "justify-end");
    expect(controls).not.toHaveClass("absolute");
  });

  it("colors service content without tinting cards and opens showcase images", async () => {
    const { container } = render(
      <LiquidGlassMiniWebsiteTemplate
        profile={{
          ...MULTITREE_MINI_WEBSITE_PREVIEW,
          sections: MULTITREE_MINI_WEBSITE_PREVIEW.sections.filter(
            (section) => section.key === "services",
          ),
          services: MULTITREE_MINI_WEBSITE_PREVIEW.services.map(
            (service, index) =>
              index === 0
                ? {
                    ...service,
                    image:
                      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
                  }
                : service,
          ),
          stories: [],
        }}
        fullPage
        interactive
      />,
    );
    await waitFor(() => {
      expect(
        container.querySelectorAll("[data-mini-service-card]").length,
      ).toBeGreaterThan(0);
    });
    const cards = Array.from(
      container.querySelectorAll("[data-mini-service-card]"),
    );
    const images = container.querySelectorAll("[data-mini-service-image]");
    const titles = container.querySelectorAll("[data-mini-service-title]");
    const clickableImages = container.querySelectorAll(
      "[data-mini-service-image][data-mini-image-src]",
    );

    expect(cards.length).toBeGreaterThan(0);
    expect(images).toHaveLength(cards.length);
    expect(titles).toHaveLength(cards.length);
    cards.forEach((card) => {
      expect(card).not.toHaveAttribute("style");
    });
    expect(
      new Set(
        Array.from(titles, (title) => (title as HTMLElement).style.color),
      ).size,
    ).toBe(cards.length);
    images.forEach((image) => {
      expect(image).toHaveClass("aspect-[16/10]", "w-full");
    });
    expect(clickableImages.length).toBeGreaterThan(0);
    clickableImages.forEach((image) => {
      expect(image).toHaveAttribute("data-mini-image-src");
      expect(image).toHaveAttribute("role", "button");
    });

    fireEvent.click(clickableImages[0]);
    expect(
      await screen.findByRole("dialog", { name: "پیشاندانی وێنە" }),
    ).toBeInTheDocument();
  });
});
