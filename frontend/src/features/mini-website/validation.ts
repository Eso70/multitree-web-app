import { validateSingleLink } from "@/features/link-editor/components/validation";
import {
  MINI_WEBSITE_LEAD_MAPPING_TYPES,
  MINI_WEBSITE_MAX_LEAD_FIELDS,
  MINI_WEBSITE_MAX_YOUTUBE_VIDEOS,
} from "@linktree/types";
import { hasOpenDay, normalizeWeek } from "./hours";
import { buildActionHref } from "./service-action";
import { buildBookingHref } from "./booking-action";
import {
  isSecureVideoUrl,
  isShortFormVideoUrl,
  isYoutubeStandardVideoUrl,
} from "./video-links";
import {
  isWebsiteColor,
  parseWebsiteColor,
} from "@/lib/utils/parse-website-color";
import { getProfessionTemplate } from "./profession-templates";
import type { MiniWebsiteDraft } from "./types";

export type MiniWebsiteEditorStep =
  "identity" | "template" | "platforms" | "socialLinks";
export type MiniWebsiteValidationErrors = Record<string, string>;

function isMiniWebsiteColor(value: string): boolean {
  return isWebsiteColor(value) && parseWebsiteColor(value).primary.length === 7;
}

function validateIdentity(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  const errors: MiniWebsiteValidationErrors = {};
  if (draft.name.trim().length < 2)
    errors.name = "ناوەکە دەبێت لانی‌کەم دوو پیت بێت.";
  if (!draft.headline.trim()) errors.headline = "سەردێڕ پێویستە.";
  if (!draft.bio.trim()) errors.bio = "پێناسەیەکی کورت پێویستە.";
  if (!isMiniWebsiteColor(draft.accentColor))
    errors.accentColor = "ڕەنگێکی دروست هەڵبژێرە.";
  if (!draft.avatar) errors.avatar = "وێنەی پڕۆفایل پێویستە.";

  const type = draft.content.heroBackgroundType;
  if (!["image", "color", "video"].includes(type)) {
    errors.heroBanner = "جۆری بانەر هەڵبژێرە.";
  } else if (type === "image" && !draft.cover) {
    errors.heroBanner = "وێنەی بانەر پێویستە.";
  } else if (
    type === "color" &&
    !isMiniWebsiteColor(draft.content.heroBackgroundColor)
  ) {
    errors.heroBanner = "ڕەنگێکی دروست بۆ بانەر هەڵبژێرە.";
  } else if (
    type === "video" &&
    !/^https?:\/\//i.test(draft.content.heroYoutubeUrl.trim())
  ) {
    errors.heroBanner = "لینکی دروستی ڤیدیۆی بانەر بنووسە.";
  }
  return errors;
}

function validateProfessionTemplate(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  return getProfessionTemplate(draft.professionTemplate)
    ? {}
    : { professionTemplate: "تکایە قالبێکبۆ پیشە یان بوارەکەت هەڵبژێرە." };
}

function isSectionEnabled(draft: MiniWebsiteDraft, key: string): boolean {
  return draft.sections.some(
    (section) => section.key === key && section.enabled,
  );
}

/**
 * Step two only chooses sections, so it checks the choice itself — the details
 * each section needs are validated in step three, where they are filled in.
 */
function validatePlatforms(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  const errors: MiniWebsiteValidationErrors = {};
  const socialsOn = isSectionEnabled(draft, "socials");
  if (!draft.sections.some((section) => section.enabled)) {
    errors.sections = "لانی‌کەم یەک بەش هەڵبژێرە.";
    return errors;
  }

  if (socialsOn && !draft.socialLinks.length) {
    errors.platforms = "لانی‌کەم یەک پلاتفۆرم هەڵبژێرە.";
  }

  return errors;
}

/**
 * Location details, validated only when that section is switched on.
 *
 * Every branch is checked and errors are keyed by index, so a problem in the
 * third one surfaces on the third card rather than as a single message that
 * gives no clue which entry is wrong.
 */
function validateLocation(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "location")) return {};

  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.locations.length) {
    errors.locations = "لانی‌کەم یەک شوێن زیاد بکە.";
    return errors;
  }

  draft.locations.forEach((location, index) => {
    const { address, area, city, lat, lng, mapUrl } = location;
    if (!address.trim() && !area.trim() && !city.trim()) {
      errors[`location.${index}.address`] = "ناونیشان بنووسە.";
    }
    if (lat === null || lng === null) {
      errors[`location.${index}.pin`] =
        "لەسەر نەخشەکە کلیک بکە بۆ دانانی نیشانەی شوێن.";
    }
    if (mapUrl.trim() && !/^https?:\/\//i.test(mapUrl.trim())) {
      errors[`location.${index}.mapUrl`] =
        "لینکی نەخشە دەبێت بە http یان https دەست پێ بکات.";
    }
  });

  return errors;
}

/**
 * Opening times, validated only when that section is switched on.
 *
 * A week with every day closed is the one shape worth rejecting: it publishes a
 * section that tells a customer nothing. Times themselves are never wrong — a
 * closing time before the opening one is a night shift.
 */
function validateHours(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "hours")) return {};
  if (hasOpenDay(normalizeWeek(draft.hours))) return {};
  return { hours: "لانی‌کەم یەک ڕۆژی کراوە دیاری بکە." };
}

/** A review needs a name and something said; stars alone are not a review. */
function validateReviews(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "reviews")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.reviews.length) {
    errors.reviews = "لانی‌کەم یەک ڕا زیاد بکە.";
    return errors;
  }
  draft.reviews.forEach((review, index) => {
    if (!review.author.trim() || !review.text.trim())
      errors[`review.${index}`] = "ناوی کڕیار و دەقی ڕاکە هەردووکیان پێویستن.";
  });
  return errors;
}

/**
 * Offers, validated only when the section is on.
 *
 * A name is the one thing an offer cannot go without — a price or a button with
 * nothing attached says nothing — and a button that goes nowhere is a dead end,
 * so a label without a destination is rejected too.
 */
function validateServices(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "services")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.services.length) {
    errors.services = "لانی‌کەم یەک خزمەتگوزاری زیاد بکە.";
    return errors;
  }
  draft.services.forEach((service, index) => {
    if (!service.title.trim()) {
      errors[`service.${index}`] = "ناوی خزمەتگوزاری پێویستە.";
      return;
    }
    if (service.actionType === "none") return;
    if (!service.actionValue.trim()) {
      errors[`service.${index}`] =
        service.actionType === "link" ? "لینکەکە بنووسە." : "ژمارەکە بنووسە.";
      return;
    }
    // The destination is described rather than typed, so the only thing left to
    // check is that it resolves to something openable.
    if (
      !buildActionHref(
        service.actionType,
        service.actionValue,
        service.actionCountryCode,
      )
    )
      errors[`service.${index}`] =
        service.actionType === "link"
          ? "لینکەکە دەبێت بە http یان https دەست پێ بکات."
          : "ژمارەیەکی دروست بنووسە.";
  });
  return errors;
}

/** A question with no answer publishes a row that tells the reader nothing. */
function validateFaq(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "faq")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.faq.length) {
    errors.faq = "لانی‌کەم یەک پرسیار زیاد بکە.";
    return errors;
  }
  draft.faq.forEach((entry, index) => {
    if (!entry.question.trim() || !entry.answer.trim())
      errors[`faq.${index}`] = "پرسیار و وەڵام هەردووکیان پێویستن.";
  });
  return errors;
}

/** The gallery is only a section once it has a picture in it. */
function validateGallery(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "gallery")) return {};
  if (draft.gallery.some((image) => image.image.trim())) return {};
  return { gallery: "لانی‌کەم یەک وێنە زیاد بکە." };
}

/** Every appointment needs a name and a secure, provider-owned destination. */
function validateBookings(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "booking")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.bookings.length) {
    errors.bookings = "لانی‌کەم یەک کاتی حجز زیاد بکە.";
    return errors;
  }
  draft.bookings.forEach((booking, index) => {
    if (!booking.title.trim()) {
      errors[`booking.${index}`] = "ناوی حجز پێویستە.";
      return;
    }
    if (
      !Number.isFinite(booking.durationMinutes) ||
      booking.durationMinutes < 5 ||
      booking.durationMinutes > 1440
    ) {
      errors[`booking.${index}`] = "ماوەکە دەبێت لە ٥ تا ١٤٤٠ خولەک بێت.";
      return;
    }
    if (!booking.actionValue.trim()) {
      errors[`booking.${index}`] =
        booking.provider === "whatsapp"
          ? "ژمارەی واتساپ بنووسە."
          : "لینکی پەڕەی حجزکردن بنووسە.";
      return;
    }
    if (
      !buildBookingHref(
        booking.provider,
        booking.actionValue,
        booking.actionCountryCode,
      )
    ) {
      errors[`booking.${index}`] =
        booking.provider === "whatsapp"
          ? "ژمارەیەکی دروستی واتساپ بنووسە."
          : "لینکی حجزکردن دەبێت بە https دەست پێ بکات.";
    }
  });
  return errors;
}

/** Every published specialist needs an identity, a role, and a usable action. */
function validateTeam(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "team")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.team.length) {
    errors.team = "لانی‌کەم یەک ئەندامی تیم زیاد بکە.";
    return errors;
  }
  draft.team.forEach((member, index) => {
    if (!member.name.trim() || !member.role.trim()) {
      errors[`team.${index}`] = "ناو و پسپۆڕی ئەندامی تیم پێویستن.";
      return;
    }
    if (member.actionType === "none") return;
    if (
      !member.actionValue.trim() ||
      !buildActionHref(
        member.actionType,
        member.actionValue,
        member.actionCountryCode,
      )
    ) {
      errors[`team.${index}`] =
        member.actionType === "link"
          ? "لینکێکی دروست بنووسە."
          : "ژمارەیەکی دروست بنووسە.";
    }
  });
  return errors;
}

function validateCertificates(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "credentials")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.certificates.length) {
    errors.certificates = "لانی‌کەم یەک بڕوانامە زیاد بکە.";
    return errors;
  }
  draft.certificates.forEach((certificate, index) => {
    if (!certificate.title.trim() || !certificate.issuer.trim()) {
      errors[`certificate.${index}`] =
        "ناوی بڕوانامە و دامەزراوەی بەخشەر پێویستن.";
      return;
    }
    if (
      certificate.verificationUrl.trim() &&
      !isSecureVideoUrl(certificate.verificationUrl)
    ) {
      errors[`certificate.${index}`] =
        "لینکی پشتڕاستکردنەوە دەبێت بە https دەست پێ بکات.";
    }
  });
  return errors;
}

function validateVideos(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "shortVideos")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.videos.length) {
    errors.videos = "لانی‌کەم یەک ڤیدیۆ زیاد بکە.";
    return errors;
  }
  const seenUrls = new Set<string>();
  draft.videos.forEach((video, index) => {
    const url = video.url.trim();
    if (!video.title.trim() || !isShortFormVideoUrl(url)) {
      errors[`video.${index}`] =
        "لینکی YouTube Shorts، TikTok یان Instagram/Facebook Reels پێویستە.";
    } else if (seenUrls.has(url)) {
      errors[`video.${index}`] = "ئەم لینکی ڕیلز یان شۆرتسە دووبارە کراوەتەوە.";
    }
    seenUrls.add(url);
  });
  return errors;
}

function validateYoutubeVideos(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "youtubeVideos")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.youtubeVideos.length) {
    errors.youtubeVideos = "لانیکەم یەک ڤیدیۆی YouTube زیاد بکە.";
    return errors;
  }
  if (draft.youtubeVideos.length > MINI_WEBSITE_MAX_YOUTUBE_VIDEOS) {
    errors.youtubeVideos = "زۆرترین ژمارەی ڤیدیۆکانی یوتوب سێ دانەیە.";
  }
  const seenUrls = new Set<string>();
  draft.youtubeVideos.forEach((video, index) => {
    const url = video.url.trim();
    if (!video.title.trim() || !isYoutubeStandardVideoUrl(url)) {
      errors[`youtubeVideo.${index}`] =
        "لینکی ڤیدیۆی ئاسایی YouTube پێویستە؛ لینکەکانی Shorts قبوڵ ناکرێن.";
    } else if (seenUrls.has(url)) {
      errors[`youtubeVideo.${index}`] =
        "ئەم لینکی ڤیدیۆی YouTube دووبارە کراوەتەوە.";
    }
    seenUrls.add(url);
  });
  return errors;
}

function validateStories(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "stories")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.stories.length) {
    errors.stories = "لانی‌کەم یەک ستۆری زیاد بکە.";
    return errors;
  }
  draft.stories.forEach((story, index) => {
    if (story.mediaType === "image" && !story.image.trim()) {
      errors[`story.${index}`] = "وێنەی ستۆری پێویستە.";
    }
    if (story.mediaType === "video" && !isSecureVideoUrl(story.url.trim())) {
      errors[`story.${index}`] = "لینکی دروستی https بۆ ڤیدیۆی ستۆری پێویستە.";
    }
  });
  return errors;
}

function validatePartners(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "partners")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.partners.length) {
    errors.partners = "لانی‌کەم یەک لۆگۆی براند زیاد بکە.";
    return errors;
  }
  draft.partners.forEach((partner, index) => {
    if (!partner.image.trim()) {
      errors[`partner.${index}`] = "لۆگۆی براند پێویستە.";
      return;
    }
    if (partner.url.trim() && !isSecureVideoUrl(partner.url)) {
      errors[`partner.${index}`] = "لینکی براند دەبێت بە https دەست پێ بکات.";
    }
  });
  return errors;
}

function validateBeforeAfter(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "beforeAfter")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.beforeAfter.length) {
    errors.beforeAfter = "لانی‌کەم یەک بەراوردی پێش و دوا زیاد بکە.";
    return errors;
  }
  draft.beforeAfter.forEach((comparison, index) => {
    if (
      !comparison.title.trim() ||
      !comparison.beforeImage.trim() ||
      !comparison.afterImage.trim()
    ) {
      errors[`beforeAfter.${index}`] =
        "ناونیشان و هەردوو وێنەی پێش و دوا پێویستن.";
    }
  });
  return errors;
}

function validateCoverage(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "serviceAreas")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.coverage.length) {
    errors.coverage = "لانی‌کەم یەک زمان زیاد بکە.";
    return errors;
  }
  draft.coverage.forEach((item, index) => {
    if (!item.name.trim()) {
      errors[`coverage.${index}`] = "ناوی زمانەکە بنووسە.";
    }
  });
  return errors;
}

function validatePaymentMethods(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "payments")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.paymentMethods.length) {
    errors.paymentMethods = "لانـی‌کەم یەک شێوازی پارەدان زیاد بکە.";
    return errors;
  }
  draft.paymentMethods.forEach((method, index) => {
    if (!method.name.trim())
      errors[`paymentMethod.${index}`] = "ناوی شێوازی پارەدان پێویستە.";
  });
  return errors;
}

function validateSpecialOffers(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "offers")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.specialOffers.length) {
    errors.specialOffers = "لانـی‌کەم یەک ئۆفەری تایبەت زیاد بکە.";
    return errors;
  }
  draft.specialOffers.forEach((offer, index) => {
    if (!offer.title.trim()) {
      errors[`specialOffer.${index}`] = "ناونیشانی ئۆفەر پێویستە.";
      return;
    }
    if (offer.url.trim() && !isSecureVideoUrl(offer.url))
      errors[`specialOffer.${index}`] =
        "لینکی ئۆفەر دەبێت بە https دەست پێ بکات.";
  });
  return errors;
}

function validateEvents(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "events")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.events.length) {
    errors.events = "لانـی‌کەم یەک ڕووداو یان وۆرکشۆپ زیاد بکە.";
    return errors;
  }
  draft.events.forEach((event, index) => {
    if (!event.title.trim() || !event.startsAt.trim()) {
      errors[`event.${index}`] = "ناونیشان و بەروار و کات پێویستن.";
      return;
    }
    if (
      event.registrationUrl.trim() &&
      !isSecureVideoUrl(event.registrationUrl)
    )
      errors[`event.${index}`] = "لینکی تۆمارکردن دەبێت بە https دەست پێ بکات.";
  });
  return errors;
}

function validateAudio(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "audio")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.audio.length) {
    errors.audio = "لانـی‌کەم یەک دەنگ یان پۆدکاست زیاد بکە.";
    return errors;
  }
  draft.audio.forEach((item, index) => {
    if (!item.title.trim() || !isSecureVideoUrl(item.url))
      errors[`audio.${index}`] = "ناونیشان و لینکی دروستی https پێویستن.";
  });
  return errors;
}

function validateAdvantages(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "whyChooseUs")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.advantages.length) {
    errors.advantages = "لانـی‌کەم یەک خاڵی بەهێز زیاد بکە.";
    return errors;
  }
  draft.advantages.forEach((advantage, index) => {
    if (!advantage.title.trim())
      errors[`advantage.${index}`] = "ناونیشانی خاڵەکە پێویستە.";
  });
  return errors;
}

function validateImpactStats(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "impactStats")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.impactStats.length) {
    errors.impactStats = "لانی‌کەم یەک ژمارەی گرنگ زیاد بکە.";
    return errors;
  }
  draft.impactStats.forEach((item, index) => {
    if (!item.value.trim() || !item.label.trim())
      errors[`impactStat.${index}`] = "ژمارە و ناونیشان پێویستن.";
  });
  return errors;
}

function validateProcessSteps(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "process")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.processSteps.length) {
    errors.processSteps = "لانی‌کەم یەک هەنگاو زیاد بکە.";
    return errors;
  }
  draft.processSteps.forEach((item, index) => {
    if (!item.title.trim()) {
      errors[`processStep.${index}`] = "ناونیشانی هەنگاو پێویستە.";
      return;
    }
    if (item.actionUrl.trim() && !isSecureVideoUrl(item.actionUrl))
      errors[`processStep.${index}`] =
        "لینکی هەنگاو دەبێت بە https دەست پێ بکات.";
  });
  return errors;
}

function validateDocuments(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "documents")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.documents.length) {
    errors.documents = "لانـی‌کەم یەک بەڵگەنامە زیاد بکە.";
    return errors;
  }
  draft.documents.forEach((document, index) => {
    if (!document.title.trim() || !isSecureVideoUrl(document.fileUrl))
      errors[`document.${index}`] =
        "ناونیشان و لینکی دروستی https بۆ فایلەکە پێویستن.";
  });
  return errors;
}

function validateOwnedProperties(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "ownedProperties")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.ownedProperties.length) {
    errors.ownedProperties =
      "لانـی‌کەم یەک براند، کۆمپانیا، پەیج یان کەناڵ زیاد بکە.";
    return errors;
  }
  draft.ownedProperties.forEach((property, index) => {
    if (
      !property.name.trim() ||
      !property.relationship.trim() ||
      !isSecureVideoUrl(property.url)
    ) {
      errors[`ownedProperty.${index}`] =
        "ناو، پەیوەندیی خاوەندارێتی و لینکی دروستی https پێویستن.";
      return;
    }
    if (property.featuredUrl.trim() && !isSecureVideoUrl(property.featuredUrl))
      errors[`ownedProperty.${index}`] =
        "لینکی ناوەڕۆکی هەڵبژێردراو دەبێت بە https دەست پێ بکات.";
  });
  return errors;
}

function validateEducation(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "education")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.education.length) {
    errors.education = "لانـی‌کەم یەک شوێنی خوێندن زیاد بکە.";
    return errors;
  }
  draft.education.forEach((entry, index) => {
    if (
      !entry.institution.trim() ||
      !entry.degree.trim() ||
      !entry.startYear.trim()
    ) {
      errors[`education.${index}`] =
        "دامەزراوە، بڕوانامە یان پلە، و ساڵی دەستپێکردن پێویستن.";
      return;
    }
    if (entry.status === "graduated" && !entry.endYear.trim()) {
      errors[`education.${index}`] = "بۆ دەرچوو، ساڵی تەواوکردن پێویستە.";
      return;
    }
    if (
      entry.verificationUrl.trim() &&
      !isSecureVideoUrl(entry.verificationUrl)
    )
      errors[`education.${index}`] =
        "لینکی پشتڕاستکردنەوە دەبێت بە https دەست پێ بکات.";
  });
  return errors;
}

function validateExperience(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "experience")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (!draft.experience.length) {
    errors.experience = "لانی‌کەم یەک ئەزموونی کار زیاد بکە.";
    return errors;
  }
  draft.experience.forEach((entry, index) => {
    if (
      !entry.title.trim() ||
      !entry.organization.trim() ||
      !entry.startDate.trim()
    ) {
      errors[`experience.${index}`] =
        "پیشە، دامەزراوە و بەرواری دەستپێک پێویستن.";
      return;
    }
    if (entry.status === "completed" && !entry.endDate.trim()) {
      errors[`experience.${index}`] =
        "بۆ کاری کۆتایی هاتوو، بەرواری کۆتایی پێویستە.";
      return;
    }
    if (entry.endDate && entry.endDate < entry.startDate) {
      errors[`experience.${index}`] =
        "بەرواری کۆتایی نابێت پێش بەرواری دەستپێک بێت.";
      return;
    }
    if (
      entry.verificationUrl.trim() &&
      !isSecureVideoUrl(entry.verificationUrl)
    )
      errors[`experience.${index}`] =
        "لینکی پشتڕاستکردنەوە دەبێت بە https دەست پێ بکات.";
  });
  return errors;
}

/**
 * The lead form, validated only when that section is switched on.
 *
 * The rules here are about whether a submission can be acted on, not about
 * taste. A form with no required way to reply produces contacts the business
 * can never follow up, and a required consent tick with no policy on the page
 * asks the visitor to agree to a promise that was never written down.
 */
function validateLeadForm(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "leadForm")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  const { fields } = draft.leadForm;
  if (!fields.length) {
    errors.leadForm = "لانی‌کەم یەک پرسیار زیاد بکە.";
    return errors;
  }
  if (fields.length > MINI_WEBSITE_MAX_LEAD_FIELDS) {
    errors.leadForm = `زۆرترین ژمارەی پرسیارەکان ${MINI_WEBSITE_MAX_LEAD_FIELDS} دانەیە.`;
  }

  const claimed = new Set<string>();
  fields.forEach((field, index) => {
    if (!field.label.trim()) {
      errors[`leadField.${index}`] = "ناونیشانی پرسیار پێویستە.";
      return;
    }
    if (field.type === "select" && !field.options.filter(Boolean).length) {
      errors[`leadField.${index}`] = "بۆ لیستی هەڵبژاردن، هەڵبژاردەکان بنووسە.";
      return;
    }
    if (field.mapping === "none") return;
    if (!MINI_WEBSITE_LEAD_MAPPING_TYPES[field.mapping].includes(field.type)) {
      errors[`leadField.${index}`] =
        "جۆری پرسیارەکە لەگەڵ بەشی CRM ـەکەی ناگونجێت.";
      return;
    }
    if (claimed.has(field.mapping)) {
      errors[`leadField.${index}`] =
        "هەر بەشێکی CRM تەنها بۆ یەک پرسیار دەبێت.";
      return;
    }
    claimed.add(field.mapping);
  });

  if (
    !fields.some(
      (field) =>
        field.required &&
        (field.mapping === "email" || field.mapping === "phone"),
    )
  ) {
    errors.leadForm =
      "پێویستە یەک پرسیاری داوایکراو بۆ ئیمەیل یان ژمارەی مۆبایل هەبێت.";
  }
  if (draft.leadForm.consentRequired && !draft.leadForm.consentText.trim()) {
    errors.leadFormConsent = "دەقی ڕەزامەندی بنووسە.";
  }
  return errors;
}

/**
 * Pricing tiers, validated only when that section is switched on.
 *
 * A table with one tier is a price tag: the section exists so a visitor can
 * compare, which needs at least two. Every tier must also list what it
 * includes, because a card with a price and no contents cannot be compared
 * against anything.
 */
function validatePlans(draft: MiniWebsiteDraft): MiniWebsiteValidationErrors {
  if (!isSectionEnabled(draft, "pricing")) return {};
  const errors: MiniWebsiteValidationErrors = {};
  if (draft.plans.length < 2) {
    errors.plans = "لانی‌کەم دوو پلان زیاد بکە بۆ بەراوردکردن.";
    return errors;
  }
  if (draft.plans.filter((plan) => plan.featured).length > 1) {
    errors.plans = "تەنها یەک پلان دەتوانێت پێشنیارکراو بێت.";
  }
  draft.plans.forEach((plan, index) => {
    if (!plan.name.trim()) {
      errors[`plan.${index}`] = "ناوی پلان پێویستە.";
      return;
    }
    if (!plan.price.trim()) {
      errors[`plan.${index}`] = "نرخی پلان پێویستە.";
      return;
    }
    if (!plan.features.filter(Boolean).length) {
      errors[`plan.${index}`] = "لانی‌کەم یەک تایبەتمەندی بنووسە.";
      return;
    }
    if (plan.actionType === "none") return;
    if (
      !plan.actionValue.trim() ||
      !buildActionHref(plan.actionType, plan.actionValue, plan.actionCountryCode)
    ) {
      errors[`plan.${index}`] =
        plan.actionType === "link"
          ? "لینکەکە دەبێت بە http یان https دەست پێ بکات."
          : "ژمارەیەکی دروست بنووسە.";
    }
  });
  return errors;
}

function validateSocialLinks(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  const errors = {
    ...validatePlatforms(draft),
    ...validateLocation(draft),
    ...validateHours(draft),
    ...validateGallery(draft),
    ...validateFaq(draft),
    ...validateServices(draft),
    ...validateBookings(draft),
    ...validateTeam(draft),
    ...validateCertificates(draft),
    ...validateVideos(draft),
    ...validateYoutubeVideos(draft),
    ...validateStories(draft),
    ...validatePartners(draft),
    ...validateReviews(draft),
    ...validateBeforeAfter(draft),
    ...validateCoverage(draft),
    ...validatePaymentMethods(draft),
    ...validateSpecialOffers(draft),
    ...validateEvents(draft),
    ...validateAudio(draft),
    ...validateAdvantages(draft),
    ...validateImpactStats(draft),
    ...validateProcessSteps(draft),
    ...validateDocuments(draft),
    ...validateOwnedProperties(draft),
    ...validateEducation(draft),
    ...validateExperience(draft),
    ...validateLeadForm(draft),
    ...validatePlans(draft),
  };
  if (!isSectionEnabled(draft, "socials")) return errors;
  for (const link of draft.socialLinks) {
    const error = validateSingleLink(
      link.platform,
      link.value || "",
      link.countryCode || "964",
    );
    if (error) errors[`social.${link.id}`] = error;
  }
  return errors;
}

export function validateMiniWebsiteStep(
  draft: MiniWebsiteDraft,
  step: MiniWebsiteEditorStep,
): MiniWebsiteValidationErrors {
  if (step === "identity") return validateIdentity(draft);
  if (step === "template") return validateProfessionTemplate(draft);
  if (step === "platforms") return validatePlatforms(draft);
  return validateSocialLinks(draft);
}

export function validateCompleteMiniWebsite(
  draft: MiniWebsiteDraft,
): MiniWebsiteValidationErrors {
  return {
    ...validateIdentity(draft),
    ...validateProfessionTemplate(draft),
    ...validatePlatforms(draft),
    ...validateSocialLinks(draft),
    ...validateHours(draft),
    ...validateGallery(draft),
    ...validateFaq(draft),
    ...validateServices(draft),
    ...validateBookings(draft),
    ...validateTeam(draft),
    ...validateCertificates(draft),
    ...validateVideos(draft),
    ...validateYoutubeVideos(draft),
    ...validateStories(draft),
    ...validatePartners(draft),
    ...validateReviews(draft),
    ...validateBeforeAfter(draft),
    ...validateCoverage(draft),
    ...validatePaymentMethods(draft),
    ...validateSpecialOffers(draft),
    ...validateEvents(draft),
    ...validateAudio(draft),
    ...validateAdvantages(draft),
    ...validateImpactStats(draft),
    ...validateProcessSteps(draft),
    ...validateDocuments(draft),
    ...validateOwnedProperties(draft),
    ...validateEducation(draft),
    ...validateExperience(draft),
    ...validateLeadForm(draft),
    ...validatePlans(draft),
  };
}
