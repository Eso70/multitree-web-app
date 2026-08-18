import dynamic from "next/dynamic";
import { createElement } from "react";
import type {
  MiniWebsiteTemplateComponent,
  MiniWebsiteTemplateProps,
} from "./types";
import { SkeletonMiniWebsiteTemplate } from "@/components/shared/Skeleton";
import {
  MINI_WEBSITE_TEMPLATE_DEFAULT_ID,
  MINI_WEBSITE_TEMPLATE_OPTIONS,
  type MiniWebsiteTemplateKey,
} from "./options";

export {
  MINI_WEBSITE_TEMPLATE_DEFAULT_ID,
  MINI_WEBSITE_TEMPLATE_OPTIONS,
  type MiniWebsiteTemplateKey,
} from "./options";

function createDynamicMiniWebsiteTemplate(
  factory: () => Promise<MiniWebsiteTemplateComponent>,
): MiniWebsiteTemplateComponent {
  return dynamic(
    () =>
      factory().then((Component) => ({
        default: Component,
      })),
    {
      ssr: true,
      loading: () => createElement(SkeletonMiniWebsiteTemplate),
    },
  ) as MiniWebsiteTemplateComponent;
}

export const LiquidGlassMiniWebsiteTemplate = createDynamicMiniWebsiteTemplate(
  () =>
    import("./liquid-glass/LiquidGlassMiniWebsiteTemplate").then(
      (module) => module.LiquidGlassMiniWebsiteTemplate,
    ),
);

export const MINI_WEBSITE_TEMPLATE_COMPONENTS: Record<
  MiniWebsiteTemplateKey,
  MiniWebsiteTemplateComponent
> = {
  "liquid-glass": LiquidGlassMiniWebsiteTemplate,
};

export function getMiniWebsiteTemplateComponent(
  templateId?: string,
): MiniWebsiteTemplateComponent {
  if (
    templateId &&
    MINI_WEBSITE_TEMPLATE_OPTIONS.some((template) => template.id === templateId)
  ) {
    return MINI_WEBSITE_TEMPLATE_COMPONENTS[
      templateId as MiniWebsiteTemplateKey
    ];
  }

  return MINI_WEBSITE_TEMPLATE_COMPONENTS[MINI_WEBSITE_TEMPLATE_DEFAULT_ID];
}

/**
 * Liquid Glass is the only mini-website renderer, so `templateId` is accepted
 * and ignored: callers still pass whatever a row happens to carry, including a
 * retired key from before the catalog was reduced.
 */
export function MiniWebsiteTemplateRenderer({
  templateId: _templateId,
  ...props
}: MiniWebsiteTemplateProps & { templateId?: string }) {
  return createElement(LiquidGlassMiniWebsiteTemplate, props);
}
export type {
  MiniWebsiteTemplateComponent,
  MiniWebsiteTemplateProps,
  MiniWebsiteTemplateViewport,
} from "./types";
