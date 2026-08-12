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
  spectrum: createDynamicTemplate(() => import("./SpectrumTemplate").then((m) => m.SpectrumTemplate)),
  spotlight: createDynamicTemplate(() => import("./SpotlightTemplate").then((m) => m.SpotlightTemplate)),
  frost: createDynamicTemplate(() => import("./FrostTemplate").then((m) => m.FrostTemplate)),
  aurora: createDynamicTemplate(() => import("./AuroraTemplate").then((m) => m.AuroraTemplate)),
  serenity: createDynamicTemplate(() => import("./SerenityTemplate").then((m) => m.SerenityTemplate)),
};

export { TEMPLATE_DEFAULT_ID, TEMPLATE_OPTIONS };
export type { TemplateKey };
export type { TemplateComponentProps, TemplateTheme } from "./types";
