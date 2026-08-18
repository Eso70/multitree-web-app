export interface TemplateOption {
  /** Stable persisted identifier. Never rename after release. */
  id: string;
  /** Concise product name shown in template catalogs and selectors. */
  name: string;
  description: string;
  /** Tailwind classes for preview gradient backgrounds. */
  previewGradient: string;
  /** Soft accent color for outlines or glows. */
  accentHex: string;
}

export const TEMPLATE_DEFAULT_ID = "spectrum";

export const TEMPLATE_OPTIONS = [
  {
    id: "spectrum",
    name: "Spectrum",
    description: "Vibrant pill-shaped buttons with colorful gradients and smooth animations.",
    previewGradient: "from-blue-400 via-purple-500 to-pink-500",
    accentHex: "#8b5cf6",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Classic stacked layout with direct buttons and no extra chrome.",
    previewGradient: "from-slate-950 via-slate-900 to-indigo-800",
    accentHex: "#818cf8",
  },
  {
    id: "frost",
    name: "Frost",
    description: "Clean frosted glass design with outlined buttons and modern aesthetics.",
    previewGradient: "from-blue-500 via-cyan-400 to-teal-500",
    accentHex: "#06b6d4",
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Beautiful aurora-inspired gradient pills with smooth transitions and elegant styling.",
    previewGradient: "from-purple-500 via-pink-500 to-orange-500",
    accentHex: "#ec4899",
  },
  {
    id: "serenity",
    name: "Serenity",
    description: "Simple and soft card-based design with gentle floating elements, clean layout, and smooth animations.",
    previewGradient: "from-pink-100 via-rose-100 to-orange-100",
    accentHex: "#f472b6",
  },
] as const satisfies readonly TemplateOption[];

type TemplateOptionsTuple = typeof TEMPLATE_OPTIONS;
export type TemplateKey = TemplateOptionsTuple[number]["id"];

export function isTemplateKey(value: string): value is TemplateKey {
  return TEMPLATE_OPTIONS.some((option) => option.id === value);
}

/** Human-readable template name for a persisted key, or null when unknown. */
export function getTemplateName(templateKey?: string | null): string | null {
  if (!templateKey) return null;
  return TEMPLATE_OPTIONS.find((option) => option.id === templateKey)?.name ?? null;
}

export function normalizeTemplateConfig(
  templateKey?: string | null,
  templateConfig?: Record<string, unknown> | null
): Record<string, unknown> {
  const config = {
    ...(templateConfig ?? {}),
  } as Record<string, unknown>;

  const existingKey = typeof config.templateKey === "string" ? config.templateKey : undefined;

  const resolvedKey = (() => {
    if (templateKey && isTemplateKey(templateKey)) {
      return templateKey;
    }
    if (existingKey && isTemplateKey(existingKey)) {
      return existingKey;
    }
    return TEMPLATE_DEFAULT_ID;
  })();

  config.templateKey = resolvedKey;

  if (typeof config.type !== "string") {
    config.type = "simple";
  }

  if (typeof config.buttonStyle !== "string") {
    config.buttonStyle = "pill";
  }

  if (typeof config.buttonGradient !== "boolean") {
    config.buttonGradient = true;
  }

  return config;
}
