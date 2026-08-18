import type { MiniWebsiteDraft } from "./types";

/**
 * Only fields accepted by SaveMiniWebsiteDto may cross the API boundary.
 * List responses also contain derived, read-only values used by the editor;
 * spreading those responses back into PATCH requests makes the strict backend
 * validation reject an otherwise valid save.
 */
const MINI_WEBSITE_SAVE_FIELDS = [
  "name",
  "slug",
  "headline",
  "bio",
  "avatar",
  "cover",
  "templateKey",
  "variation",
  "backgroundStyle",
  "professionTemplate",
  "accentColor",
  "status",
  "primaryAction",
  "whatsappNumber",
  "pixelEvent",
  "eventValue",
  "socialLinks",
  "sections",
  "locations",
  "hours",
  "gallery",
  "faq",
  "services",
  "bookings",
  "team",
  "certificates",
  "videos",
  "youtubeVideos",
  "stories",
  "partners",
  "reviews",
  "beforeAfter",
  "coverage",
  "paymentMethods",
  "specialOffers",
  "events",
  "audio",
  "advantages",
  "impactStats",
  "processSteps",
  "documents",
  "ownedProperties",
  "education",
  "experience",
  "leadForm",
  "plans",
  "content",
] as const satisfies readonly (keyof MiniWebsiteDraft)[];

export type MiniWebsiteSavePayload = Pick<
  MiniWebsiteDraft,
  (typeof MINI_WEBSITE_SAVE_FIELDS)[number]
>;

export function createMiniWebsiteSavePayload(
  draft: MiniWebsiteDraft,
): MiniWebsiteSavePayload {
  return Object.fromEntries(
    MINI_WEBSITE_SAVE_FIELDS.map((field) => [field, draft[field]]),
  ) as MiniWebsiteSavePayload;
}
