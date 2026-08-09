import dynamic from "next/dynamic";
import type { TemplateComponent } from "./types";
import {
  TEMPLATE_DEFAULT_ID,
  TEMPLATE_OPTIONS,
  type TemplateKey,
} from "@/lib/templates/config";

function createDynamicTemplate(factory: () => Promise<TemplateComponent>): TemplateComponent {
  return dynamic(
    () =>
      factory().then((Component) => ({
        default: Component,
      })),
    {
      ssr: true,
      loading: () => null,
    },
  ) as TemplateComponent;
}

export const TEMPLATE_COMPONENTS: Record<TemplateKey, TemplateComponent> = {
  "colorful-pills": createDynamicTemplate(() => import("./ColorfulPillsTemplate").then((m) => m.ColorfulPillsTemplate)),
  "mobile-spotlight": createDynamicTemplate(() => import("./ModernGlassTemplate").then((m) => m.ModernGlassTemplate)),
  "frosted-outline": createDynamicTemplate(() => import("./FrostedOutlineTemplate").then((m) => m.FrostedOutlineTemplate)),
  "aurora-pills": createDynamicTemplate(() => import("./AuroraPillsTemplate").then((m) => m.AuroraPillsTemplate)),
  "gentle-flow": createDynamicTemplate(() => import("./GentleFlowTemplate").then((m) => m.GentleFlowTemplate)),
  "hero-image": createDynamicTemplate(() => import("./HeroImageTemplate").then((m) => m.HeroImageTemplate)),
  "dark-card": createDynamicTemplate(() => import("./DarkCardTemplate").then((m) => m.DarkCardTemplate)),
};

export { TEMPLATE_DEFAULT_ID, TEMPLATE_OPTIONS };
export type { TemplateKey };
export type { TemplateComponentProps, TemplateTheme } from "./types";
