export const MINI_WEBSITE_TEMPLATE_DEFAULT_ID = "liquid-glass";

export const MINI_WEBSITE_TEMPLATE_OPTIONS = [
  {
    id: MINI_WEBSITE_TEMPLATE_DEFAULT_ID,
    name: "Liquid Glass",
    description: "Transparent liquid-glass cards over a customizable background.",
  },
] as const;

export type MiniWebsiteTemplateKey =
  (typeof MINI_WEBSITE_TEMPLATE_OPTIONS)[number]["id"];
