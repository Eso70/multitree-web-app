import {
  MINI_WEBSITE_MAX_ADVANTAGES,
  MINI_WEBSITE_MAX_AUDIO_ITEMS,
  MINI_WEBSITE_MAX_BEFORE_AFTER,
  MINI_WEBSITE_MAX_BOOKINGS,
  MINI_WEBSITE_MAX_CERTIFICATES,
  MINI_WEBSITE_MAX_COVERAGE_ITEMS,
  MINI_WEBSITE_MAX_DOCUMENTS,
  MINI_WEBSITE_MAX_EDUCATION_ENTRIES,
  MINI_WEBSITE_MAX_EXPERIENCE_ENTRIES,
  MINI_WEBSITE_MAX_EVENTS,
  MINI_WEBSITE_MAX_FAQ_ENTRIES,
  MINI_WEBSITE_MAX_GALLERY_IMAGES,
  MINI_WEBSITE_MAX_IMPACT_STATS,
  MINI_WEBSITE_MAX_LEAD_FIELDS,
  MINI_WEBSITE_MAX_PLANS,
  MINI_WEBSITE_MAX_PROCESS_STEPS,
  MINI_WEBSITE_MAX_LOCATIONS,
  MINI_WEBSITE_MAX_OWNED_PROPERTIES,
  MINI_WEBSITE_MAX_PARTNERS,
  MINI_WEBSITE_MAX_PAYMENT_METHODS,
  MINI_WEBSITE_MAX_REVIEWS,
  MINI_WEBSITE_MAX_SERVICES,
  MINI_WEBSITE_MAX_SPECIAL_OFFERS,
  MINI_WEBSITE_MAX_STORIES,
  MINI_WEBSITE_MAX_TEAM_MEMBERS,
  MINI_WEBSITE_MAX_VIDEOS,
  MINI_WEBSITE_MAX_YOUTUBE_VIDEOS,
} from "@linktree/types";
import type { MiniWebsiteDraft, MiniWebsiteSectionKey } from "./types";

export function getSectionCountLabel(
  draft: MiniWebsiteDraft,
  key: MiniWebsiteSectionKey,
): string | undefined {
  const countAndLimit: Partial<
    Record<MiniWebsiteSectionKey, [number, number]>
  > = {
    location: [draft.locations.length, MINI_WEBSITE_MAX_LOCATIONS],
    gallery: [draft.gallery.length, MINI_WEBSITE_MAX_GALLERY_IMAGES],
    faq: [draft.faq.length, MINI_WEBSITE_MAX_FAQ_ENTRIES],
    services: [draft.services.length, MINI_WEBSITE_MAX_SERVICES],
    booking: [draft.bookings.length, MINI_WEBSITE_MAX_BOOKINGS],
    team: [draft.team.length, MINI_WEBSITE_MAX_TEAM_MEMBERS],
    credentials: [draft.certificates.length, MINI_WEBSITE_MAX_CERTIFICATES],
    shortVideos: [draft.videos.length, MINI_WEBSITE_MAX_VIDEOS],
    youtubeVideos: [
      draft.youtubeVideos.length,
      MINI_WEBSITE_MAX_YOUTUBE_VIDEOS,
    ],
    stories: [draft.stories.length, MINI_WEBSITE_MAX_STORIES],
    partners: [draft.partners.length, MINI_WEBSITE_MAX_PARTNERS],
    reviews: [draft.reviews.length, MINI_WEBSITE_MAX_REVIEWS],
    beforeAfter: [draft.beforeAfter.length, MINI_WEBSITE_MAX_BEFORE_AFTER],
    serviceAreas: [draft.coverage.length, MINI_WEBSITE_MAX_COVERAGE_ITEMS],
    payments: [draft.paymentMethods.length, MINI_WEBSITE_MAX_PAYMENT_METHODS],
    offers: [draft.specialOffers.length, MINI_WEBSITE_MAX_SPECIAL_OFFERS],
    events: [draft.events.length, MINI_WEBSITE_MAX_EVENTS],
    audio: [draft.audio.length, MINI_WEBSITE_MAX_AUDIO_ITEMS],
    whyChooseUs: [draft.advantages.length, MINI_WEBSITE_MAX_ADVANTAGES],
    impactStats: [draft.impactStats.length, MINI_WEBSITE_MAX_IMPACT_STATS],
    process: [draft.processSteps.length, MINI_WEBSITE_MAX_PROCESS_STEPS],
    documents: [draft.documents.length, MINI_WEBSITE_MAX_DOCUMENTS],
    ownedProperties: [
      draft.ownedProperties.length,
      MINI_WEBSITE_MAX_OWNED_PROPERTIES,
    ],
    education: [draft.education.length, MINI_WEBSITE_MAX_EDUCATION_ENTRIES],
    experience: [draft.experience.length, MINI_WEBSITE_MAX_EXPERIENCE_ENTRIES],
    leadForm: [draft.leadForm.fields.length, MINI_WEBSITE_MAX_LEAD_FIELDS],
    pricing: [draft.plans.length, MINI_WEBSITE_MAX_PLANS],
  };
  const count = countAndLimit[key];
  return count ? `${count[0]} / ${count[1]}` : undefined;
}
