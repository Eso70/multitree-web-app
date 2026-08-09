import {
  createMiniWebsiteAdvantage,
  createMiniWebsiteImpactStat,
  createMiniWebsiteProcessStep,
  createMiniWebsiteAudio,
  createMiniWebsiteBeforeAfter,
  createMiniWebsiteBooking,
  createMiniWebsiteCertificate,
  createMiniWebsiteCoverageItem,
  createMiniWebsiteDocument,
  createMiniWebsiteEducation,
  createMiniWebsiteExperience,
  createMiniWebsiteEvent,
  createMiniWebsiteFaqEntry,
  createMiniWebsiteLeadForm,
  createMiniWebsiteLocation,
  createMiniWebsiteOwnedProperty,
  createMiniWebsitePartner,
  createMiniWebsitePaymentMethod,
  createMiniWebsitePlan,
  createMiniWebsiteReview,
  createMiniWebsiteService,
  createMiniWebsiteSpecialOffer,
  createMiniWebsiteStory,
  createMiniWebsiteTeamMember,
  createMiniWebsiteVideo,
  createMiniWebsiteYoutubeVideo,
} from "@linktree/types";
import type { MiniWebsiteDraft } from "./types";

/**
 * Give each enabled repeatable section its first editable row before the final
 * wizard step is shown. Existing rows are always preserved, making this safe
 * to call again when the user moves back and forward through the wizard.
 *
 * Social links are created by the platform picker, hours already has seven
 * rows, and the gallery starts with its upload control, so none needs a blank
 * placeholder item here.
 */
export function ensureEnabledSectionDefaults(
  draft: MiniWebsiteDraft,
): MiniWebsiteDraft {
  const enabled = new Set(
    draft.sections
      .filter((section) => section.enabled)
      .map((section) => section.key),
  );
  const payment = createMiniWebsitePaymentMethod();

  return {
    ...draft,
    locations:
      enabled.has("location") && draft.locations.length === 0
        ? [createMiniWebsiteLocation()]
        : draft.locations,
    faq:
      enabled.has("faq") && draft.faq.length === 0
        ? [createMiniWebsiteFaqEntry()]
        : draft.faq,
    services:
      enabled.has("services") && draft.services.length === 0
        ? [createMiniWebsiteService()]
        : draft.services,
    bookings:
      enabled.has("booking") && draft.bookings.length === 0
        ? [createMiniWebsiteBooking()]
        : draft.bookings,
    team:
      enabled.has("team") && draft.team.length === 0
        ? [createMiniWebsiteTeamMember()]
        : draft.team,
    certificates:
      enabled.has("credentials") && draft.certificates.length === 0
        ? [createMiniWebsiteCertificate()]
        : draft.certificates,
    videos:
      enabled.has("shortVideos") && draft.videos.length === 0
        ? [createMiniWebsiteVideo()]
        : draft.videos,
    youtubeVideos:
      enabled.has("youtubeVideos") && draft.youtubeVideos.length === 0
        ? [createMiniWebsiteYoutubeVideo()]
        : draft.youtubeVideos,
    stories:
      enabled.has("stories") && draft.stories.length === 0
        ? [createMiniWebsiteStory()]
        : draft.stories,
    partners:
      enabled.has("partners") && draft.partners.length === 0
        ? [createMiniWebsitePartner()]
        : draft.partners,
    reviews:
      enabled.has("reviews") && draft.reviews.length === 0
        ? [createMiniWebsiteReview()]
        : draft.reviews,
    beforeAfter:
      enabled.has("beforeAfter") && draft.beforeAfter.length === 0
        ? [createMiniWebsiteBeforeAfter()]
        : draft.beforeAfter,
    coverage:
      enabled.has("serviceAreas") && draft.coverage.length === 0
        ? [createMiniWebsiteCoverageItem("language")]
        : draft.coverage,
    paymentMethods:
      enabled.has("payments") && draft.paymentMethods.length === 0
        ? [payment]
        : draft.paymentMethods,
    specialOffers:
      enabled.has("offers") && draft.specialOffers.length === 0
        ? [createMiniWebsiteSpecialOffer()]
        : draft.specialOffers,
    events:
      enabled.has("events") && draft.events.length === 0
        ? [createMiniWebsiteEvent()]
        : draft.events,
    audio:
      enabled.has("audio") && draft.audio.length === 0
        ? [createMiniWebsiteAudio()]
        : draft.audio,
    advantages:
      enabled.has("whyChooseUs") && draft.advantages.length === 0
        ? [createMiniWebsiteAdvantage()]
        : draft.advantages,
    impactStats:
      enabled.has("impactStats") && draft.impactStats.length === 0
        ? [createMiniWebsiteImpactStat()]
        : draft.impactStats,
    processSteps:
      enabled.has("process") && draft.processSteps.length === 0
        ? [createMiniWebsiteProcessStep()]
        : draft.processSteps,
    documents:
      enabled.has("documents") && draft.documents.length === 0
        ? [createMiniWebsiteDocument()]
        : draft.documents,
    ownedProperties:
      enabled.has("ownedProperties") && draft.ownedProperties.length === 0
        ? [createMiniWebsiteOwnedProperty()]
        : draft.ownedProperties,
    education:
      enabled.has("education") && draft.education.length === 0
        ? [createMiniWebsiteEducation()]
        : draft.education,
    experience:
      enabled.has("experience") && draft.experience.length === 0
        ? [createMiniWebsiteExperience()]
        : draft.experience,
    // The form arrives already asking for a name and a way to reply, because a
    // blank one can be published as a section that collects nothing usable.
    leadForm:
      enabled.has("leadForm") && draft.leadForm.fields.length === 0
        ? createMiniWebsiteLeadForm()
        : draft.leadForm,
    // Two tiers, not one: a pricing table with a single card is a price tag,
    // and the section only earns its place by letting them be compared.
    plans:
      enabled.has("pricing") && draft.plans.length === 0
        ? [createMiniWebsitePlan(), createMiniWebsitePlan()]
        : draft.plans,
  };
}
