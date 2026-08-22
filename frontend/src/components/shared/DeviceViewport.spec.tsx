import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DeviceViewport,
  DEVICE_VIEWPORT_HEIGHT,
  DEVICE_VIEWPORT_WIDTH,
} from "@/components/shared/DeviceViewport";

function frame() {
  return screen.getByTitle("preview") as HTMLIFrameElement;
}

describe("DeviceViewport", () => {
  it("renders its children inside the nested document, not the host one", async () => {
    render(
      <DeviceViewport title="preview">
        <p data-testid="page">preview content</p>
      </DeviceViewport>,
    );

    await waitFor(() =>
      expect(
        frame().contentDocument?.querySelector("[data-testid='page']"),
      ).not.toBeNull(),
    );

    // The host document must not contain it: that is the whole point — a child
    // rendered here would resolve its media queries against the dashboard.
    expect(document.body.querySelector("[data-testid='page']")).toBeNull();
  });

  /**
   * The frame is laid out at the device's own pixel size and scaled from its
   * corner, so the page inside always believes it is on a phone.
   */
  it("lays the frame out at the device viewport size", () => {
    render(
      <DeviceViewport title="preview">
        <p>preview content</p>
      </DeviceViewport>,
    );

    expect(frame().style.width).toBe(`${DEVICE_VIEWPORT_WIDTH}px`);
    expect(frame().style.height).toBe(`${DEVICE_VIEWPORT_HEIGHT}px`);
    expect(frame().style.transform).toContain(
      `calc(100cqw / ${DEVICE_VIEWPORT_WIDTH}px)`,
    );
  });

  it("copies the host stylesheets in so the page is styled as it ships", async () => {
    const hostStyle = document.createElement("style");
    hostStyle.textContent = ".marker { color: rgb(1, 2, 3); }";
    document.head.appendChild(hostStyle);

    render(
      <DeviceViewport title="preview">
        <p className="marker">preview content</p>
      </DeviceViewport>,
    );

    await waitFor(() => {
      const copied = frame().contentDocument?.head.querySelectorAll(
        "[data-device-viewport-style]",
      );
      expect(copied?.length).toBeGreaterThan(0);
    });

    const heads = Array.from(
      frame().contentDocument?.head.querySelectorAll("style") || [],
    ).map((node) => node.textContent || "");
    expect(heads.some((text) => text.includes(".marker"))).toBe(true);

    hostStyle.remove();
  });

  it("builds no nested document until it is activated", () => {
    const { rerender } = render(
      <DeviceViewport title="preview" active={false}>
        <p data-testid="page">preview content</p>
      </DeviceViewport>,
    );

    expect(screen.queryByTitle("preview")).toBeNull();
    expect(document.body.querySelector("[data-testid='page']")).toBeNull();

    rerender(
      <DeviceViewport title="preview">
        <p data-testid="page">preview content</p>
      </DeviceViewport>,
    );

    expect(screen.getByTitle("preview")).toBeInTheDocument();
  });

  it("scrolls a taller page by default rather than cutting it off", async () => {
    const { rerender } = render(
      <DeviceViewport title="preview">
        <p>preview content</p>
      </DeviceViewport>,
    );

    const overflowRules = async () => {
      let text = "";
      await waitFor(() => {
        text = Array.from(
          frame().contentDocument?.head.querySelectorAll("style") || [],
        )
          .map((node) => node.textContent || "")
          .join("\n");
        expect(text).toContain("overflow-y");
      });
      return text;
    };

    expect(await overflowRules()).toContain("overflow-y: auto");

    rerender(
      <DeviceViewport title="preview" scrollable={false}>
        <p>preview content</p>
      </DeviceViewport>,
    );

    await waitFor(async () =>
      expect(await overflowRules()).toContain("overflow-y: hidden"),
    );
  });
});
