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
}

export type MiniWebsiteTemplateComponent =
  ComponentType<MiniWebsiteTemplateProps>;
