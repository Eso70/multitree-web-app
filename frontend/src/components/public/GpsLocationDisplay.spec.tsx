import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GpsLocationDisplay } from "./GpsLocationDisplay";

const gpsLink = {
  id: "gps-link-id",
  platform: "gps",
  url: "35.5558, 45.4351",
};

describe("GpsLocationDisplay", () => {
  it("uses Kurdish interface copy while preserving the Google Maps brand", () => {
    render(
      <GpsLocationDisplay
        gpsLink={{
          id: "gps-preview",
          platform: "gps",
          url: "35.5558, 45.4351",
        }}
      />,
    );

    expect(screen.getByLabelText("شوێنی GPS")).toBeInTheDocument();
    expect(screen.getByText("شوێنی GPS")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "لە Google Maps بیکەرەوە" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Open in Google Maps")).not.toBeInTheDocument();
  });

  it("reports the maps click through the page's own link handler", () => {
    const onOpen = vi.fn();
    render(<GpsLocationDisplay gpsLink={gpsLink} onOpen={onOpen} />);

    const link = screen.getByRole("link", { name: "لە Google Maps بیکەرەوە" });
    const opened = fireEvent.click(link);

    // The GPS link is pulled out of the rendered button list but still owns a
    // registered action row, so this click is what stops that row reporting a
    // permanent zero.
    expect(onOpen).toHaveBeenCalledWith(
      "gps-link-id",
      "https://www.google.com/maps?q=35.5558,45.4351",
      "gps",
      null,
    );
    // Default prevented: the handler opens the tab, so the anchor must not
    // open a second one.
    expect(opened).toBe(false);
  });

  it("keeps native navigation when no handler is supplied", () => {
    render(<GpsLocationDisplay gpsLink={gpsLink} />);

    const link = screen.getByRole("link", { name: "لە Google Maps بیکەرەوە" });

    expect(fireEvent.click(link)).toBe(true);
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps?q=35.5558,45.4351",
    );
  });
});
