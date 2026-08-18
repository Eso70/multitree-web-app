import {
  MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT,
  type MiniWebsiteVisualTemplateKey,
} from "@linktree/types";

export const MINI_WEBSITE_TEMPLATE_DEFAULT_ID =
  MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT;

export const MINI_WEBSITE_TEMPLATE_OPTIONS: readonly {
  id: MiniWebsiteVisualTemplateKey;
  name: string;
  description: string;
  previewTone: "light" | "dark";
  previewGradient: string;
}[] = [
  {
    id: MINI_WEBSITE_TEMPLATE_DEFAULT_ID,
    name: "Liquid Glass",
    description:
      "Transparent liquid-glass cards over a customizable background.",
    previewTone: "light",
    previewGradient: "from-cyan-300 via-blue-400 to-violet-500",
  },
];

export type MiniWebsiteTemplateKey = MiniWebsiteVisualTemplateKey;

export function isMiniWebsiteTemplateKey(
  value: string,
): value is MiniWebsiteTemplateKey {
  return MINI_WEBSITE_TEMPLATE_OPTIONS.some((option) => option.id === value);
}
