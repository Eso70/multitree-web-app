import { describe, expect, it } from "vitest";
import { createMiniWebsiteBooking } from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import {
  bookingHref,
  buildBookingHref,
  detectBookingProvider,
  phoneFromWhatsAppUrl,
} from "./booking-action";

describe("booking destinations", () => {
  it("accepts secure external scheduler URLs", () => {
    expect(
      buildBookingHref("calendly", "https://calendly.com/acme/demo", "964"),
    ).toBe("https://calendly.com/acme/demo");
  });

  it("rejects insecure and executable destinations", () => {
    expect(buildBookingHref("custom", "http://example.com/book", "964")).toBe(
      "",
    );
    expect(buildBookingHref("custom", "javascript:alert(1)", "964")).toBe("");
  });

  it("builds WhatsApp booking destinations from national numbers", () => {
    expect(buildBookingHref("whatsapp", "07501234567", "964")).toBe(
      "https://wa.me/9647501234567",
    );
  });

  it("prefers the server-built destination", () => {
    const booking = createMiniWebsiteBooking("booking-1");
    expect(
      bookingHref({
        ...booking,
        actionValue: "https://example.com/ignored",
        url: "https://cal.com/acme",
      }),
    ).toBe("https://cal.com/acme");
  });

  it("detects the provider from pasted booking links", () => {
    expect(
      detectBookingProvider("https://calendly.com/acme/consultation"),
    ).toBe("calendly");
    expect(detectBookingProvider("https://cal.com/acme/consultation")).toBe(
      "calcom",
    );
    expect(detectBookingProvider("https://calendar.app.google/abc123")).toBe(
      "google",
    );
    expect(detectBookingProvider("https://example.com/book")).toBe("custom");
    expect(detectBookingProvider("javascript:alert(1)")).toBeNull();
  });

  it("extracts the number and country from a pasted WhatsApp link", () => {
    expect(phoneFromWhatsAppUrl("https://wa.me/9647501234567", "44")).toEqual({
      value: "7501234567",
      countryCode: "964",
    });
  });
});

describe("booking section", () => {
  const validBooking = {
    ...createMiniWebsiteBooking("booking-1"),
    title: "ڕاوێژکاری",
    actionValue: "https://cal.com/acme/consultation",
  };

  const errorsFor = (bookings: ReturnType<typeof createMiniWebsiteBooking>[]) =>
    validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "booking", enabled: true }],
        bookings,
      },
      "socialLinks",
    );

  it("counts as a section without requiring social links", () => {
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "booking", enabled: true }],
        bookings: [validBooking],
      },
      "platforms",
    );
    expect(errors.sections).toBeUndefined();
    expect(errors.platforms).toBeUndefined();
  });

  it("requires at least one appointment", () => {
    expect(errorsFor([]).bookings).toBeTruthy();
  });

  it("rejects a missing title, invalid duration, or insecure URL", () => {
    expect(
      errorsFor([{ ...validBooking, title: "" }])["booking.0"],
    ).toBeTruthy();
    expect(
      errorsFor([{ ...validBooking, durationMinutes: 2 }])["booking.0"],
    ).toBeTruthy();
    expect(
      errorsFor([
        {
          ...validBooking,
          provider: "custom",
          actionValue: "http://example.com/book",
        },
      ])["booking.0"],
    ).toBeTruthy();
  });

  it("accepts a WhatsApp booking number", () => {
    expect(
      errorsFor([
        {
          ...validBooking,
          provider: "whatsapp",
          actionValue: "07501234567",
        },
      ])["booking.0"],
    ).toBeUndefined();
  });
});
