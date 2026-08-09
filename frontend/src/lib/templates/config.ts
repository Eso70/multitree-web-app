export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  /** Tailwind classes for preview gradient backgrounds. */
  previewGradient: string;
  /** Soft accent color for outlines or glows. */
  accentHex: string;
}

export const TEMPLATE_DEFAULT_ID = "colorful-pills";

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "colorful-pills",
    name: "Colorful Pills",
    description: "Vibrant pill-shaped buttons with colorful gradients and smooth animations.",
    previewGradient: "from-blue-400 via-purple-500 to-pink-500",
    accentHex: "#8b5cf6",
  },
  {
    id: "mobile-spotlight",
    name: "Mobile Spotlight",
    description: "Classic stacked layout with direct buttons and no extra chrome.",
    previewGradient: "from-slate-950 via-slate-900 to-indigo-800",
    accentHex: "#818cf8",
  },
  {
    id: "frosted-outline",
    name: "Frosted Outline",
    description: "Clean frosted glass design with outlined buttons and modern aesthetics.",
    previewGradient: "from-blue-500 via-cyan-400 to-teal-500",
    accentHex: "#06b6d4",
  },
  {
    id: "aurora-pills",
    name: "Aurora Pills",
    description: "Beautiful aurora-inspired gradient pills with smooth transitions and elegant styling.",
    previewGradient: "from-purple-500 via-pink-500 to-orange-500",
    accentHex: "#ec4899",
  },
  {
    id: "gentle-flow",
    name: "Gentle Flow",
    description: "Simple and soft card-based design with gentle floating elements, clean layout, and smooth animations.",
    previewGradient: "from-pink-100 via-rose-100 to-orange-100",
    accentHex: "#f472b6",
  },
  {
    id: "hero-image",
    name: "Hero Image",
    description: "Stunning full-width hero image at top (half viewport height) with gradient fade transition to beautiful dark buttons below.",
    previewGradient: "from-black via-gray-900 to-black",
    accentHex: "#000000",
  },
  {
    id: "dark-card",
    name: "Dark Card",
    description: "Premium dark navy background with white description card and platform-colored buttons.",
    previewGradient: "from-slate-900 via-slate-800 to-indigo-950",
    accentHex: "#1e293b",
  },
];

type TemplateOptionsTuple = typeof TEMPLATE_OPTIONS;
export type TemplateKey = TemplateOptionsTuple[number]["id"];

export function isTemplateKey(value: string): value is TemplateKey {
  return TEMPLATE_OPTIONS.some((option) => option.id === value);
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
