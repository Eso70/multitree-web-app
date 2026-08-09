import type {
  MiniWebsiteBooking,
  MiniWebsiteBookingProvider,
} from "@linktree/types";
import { buildActionHref } from "./service-action";

export const BOOKING_PROVIDER_LABELS: Record<
  MiniWebsiteBookingProvider,
  string
> = {
  calendly: "Calendly",
  calcom: "Cal.com",
  google: "Google Calendar",
  custom: "لینکی تر",
  whatsapp: "واتساپ",
};

export const BOOKING_ACTION_LABELS: Record<MiniWebsiteBookingProvider, string> =
  {
    calendly: "حجزکردن لە Calendly",
    calcom: "حجزکردن لە Cal.com",
    google: "حجزکردن لە Google Calendar",
    custom: "حجزکردنی کات",
    whatsapp: "حجزکردن لە واتساپ",
  };

export const BOOKING_INPUT_PLACEHOLDERS: Record<
  Exclude<MiniWebsiteBookingProvider, "whatsapp">,
  string
> = {
  calendly: "https://calendly.com/your-name/appointment",
  calcom: "https://cal.com/your-name/appointment",
  google: "https://calendar.app.google/your-booking-link",
  custom: "https://your-website.com/book",
};

function hostnameMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * Recognises known booking providers from a pasted public URL.
 *
 * Any other secure URL is a custom provider. Incomplete or unsafe text returns
 * nothing, so typing cannot unexpectedly change the selected dropdown.
 */
export function detectBookingProvider(
  value: string,
): MiniWebsiteBookingProvider | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostnameMatches(hostname, "calendly.com")) return "calendly";
    if (hostnameMatches(hostname, "cal.com")) return "calcom";
    if (
      hostnameMatches(hostname, "calendar.app.google") ||
      hostnameMatches(hostname, "calendar.google.com")
    ) {
      return "google";
    }
    if (
      hostnameMatches(hostname, "wa.me") ||
      hostnameMatches(hostname, "whatsapp.com")
    ) {
      return "whatsapp";
    }
    return "custom";
  } catch {
    return null;
  }
}

/**
 * Pulls the phone number out of a public WhatsApp URL.
 *
 * Recognises the dialling codes offered by the country selector and otherwise
 * keeps the currently selected country.
 */
export function phoneFromWhatsAppUrl(
  value: string,
  countryCode: string,
): { value: string; countryCode: string } | null {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const raw = hostnameMatches(hostname, "wa.me")
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("phone");
    let digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return null;
    let detectedCountryCode = countryCode;
    // These are the dialling codes currently offered by the shared country
    // selector. Longest first prevents +964 from being mistaken for +96.
    const supportedCodes = ["964", "966", "971", "98", "90", "44", "1"];
    const matchedCode = supportedCodes.find(
      (code) => digits.startsWith(code) && digits.length > code.length,
    );
    if (matchedCode) {
      detectedCountryCode = matchedCode;
      digits = digits.slice(matchedCode.length);
    } else if (
      countryCode &&
      digits.startsWith(countryCode) &&
      digits.length > countryCode.length
    ) {
      digits = digits.slice(countryCode.length);
    }
    return {
      value: digits.replace(/^0+/, ""),
      countryCode: detectedCountryCode,
    };
  } catch {
    return null;
  }
}

/** Mirrors the backend rule: schedulers use HTTPS, WhatsApp uses a number. */
export function buildBookingHref(
  provider: MiniWebsiteBookingProvider,
  value: string,
  countryCode: string,
): string {
  if (provider === "whatsapp") {
    return buildActionHref("whatsapp", value, countryCode);
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function bookingHref(booking: MiniWebsiteBooking): string {
  return (
    booking.url ||
    buildBookingHref(
      booking.provider,
      booking.actionValue,
      booking.actionCountryCode,
    )
  );
}

export function bookingActionLabel(booking: MiniWebsiteBooking): string {
  return booking.actionLabel.trim() || BOOKING_ACTION_LABELS[booking.provider];
}
