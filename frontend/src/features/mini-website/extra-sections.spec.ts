import { describe, expect, it } from "vitest";
import {
  createMiniWebsiteAdvantage,
  createMiniWebsiteAudio,
  createMiniWebsiteDocument,
  createMiniWebsiteEvent,
  createMiniWebsitePaymentMethod,
  createMiniWebsiteSpecialOffer,
} from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";

describe("payments, offers, events, audio, advantages, and documents", () => {
  it("accepts complete entries for all six sections", () => {
    const payment = {
      ...createMiniWebsitePaymentMethod("fib", "payment-1"),
      name: "FIB",
    };
    const offer = {
      ...createMiniWebsiteSpecialOffer("offer-1"),
      title: "Summer offer",
      url: "https://example.com/offer",
    };
    const event = {
      ...createMiniWebsiteEvent("event-1"),
      title: "Workshop",
      startsAt: "2026-08-20T18:00",
      registrationUrl: "https://example.com/register",
    };
    const audio = {
      ...createMiniWebsiteAudio("audio-1"),
      title: "Episode one",
      url: "https://example.com/episode.mp3",
    };
    const advantage = {
      ...createMiniWebsiteAdvantage("advantage-1"),
      title: "Trusted experience",
    };
    const document = {
      ...createMiniWebsiteDocument("document-1"),
      title: "Catalogue",
      fileUrl: "https://example.com/catalogue.pdf",
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [
          { key: "payments", enabled: true },
          { key: "offers", enabled: true },
          { key: "events", enabled: true },
          { key: "audio", enabled: true },
          { key: "whyChooseUs", enabled: true },
          { key: "documents", enabled: true },
        ],
        paymentMethods: [payment],
        specialOffers: [offer],
        events: [event],
        audio: [audio],
        advantages: [advantage],
        documents: [document],
      },
      "socialLinks",
    );

    expect(errors).toEqual({});
  });

  it("rejects incomplete and insecure destinations", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [
      { key: "audio", enabled: true },
      { key: "documents", enabled: true },
    ];
    draft.audio = [
      {
        ...createMiniWebsiteAudio("audio-1"),
        title: "Episode",
        url: "http://example.com/episode.mp3",
      },
    ];
    draft.documents = [
      {
        ...createMiniWebsiteDocument("document-1"),
        title: "Report",
        fileUrl: "",
      },
    ];

    const errors = validateMiniWebsiteStep(draft, "socialLinks");
    expect(errors["audio.0"]).toBeTruthy();
    expect(errors["document.0"]).toBeTruthy();
  });
});
