import type { ComponentType } from "react";
import type {
  MiniWebsite,
  MiniWebsiteDraft,
} from "@/features/mini-website/types";

export type MiniWebsiteTemplateViewport = "mobile" | "tablet" | "desktop";

/** A live business page or the in-progress draft the editors work on. */
export type ProfileLike = MiniWebsite | MiniWebsiteDraft;

export interface MiniWebsiteTemplateProps {
  profile: ProfileLike;
  compact?: boolean;
  viewport?: MiniWebsiteTemplateViewport;
  interactive?: boolean;
  fullPage?: boolean;
  /** Shows the template's real page surface inside a dashboard preview. */
  embeddedPreview?: boolean;
  /**
   * Where the lead form posts. Absent in the editor and template previews, so
   * the form renders and validates but cannot create a lead from a draft page.
   */
  leadFormEndpoint?: string;
  /**
   * Called with the event id the lead was submitted under, so the page can
   * fire the browser half of the conversion against the same id the server
   * ingests. Absent wherever `leadFormEndpoint` is.
   */
  onLeadSubmitted?: (eventId: string) => void;
}

export type MiniWebsiteTemplateComponent =
  ComponentType<MiniWebsiteTemplateProps>;
