import type { TemplateKey } from "@/lib/templates/config";

export interface EditLinkData {
  linktree: {
    id: string;
    name: string;
    subtitle?: string | null;
    description?: string | null;
    seo_name?: string | null;
    uid: string;
    image?: string | null;
    background_color: string;
    template_config?: Record<string, unknown> | null;
    footer_text?: string | null;
    footer_phone?: string | null;
    footer_hidden?: boolean | null;
    status?: string;
  };
  links: Array<{
    id: string;
    platform: string;
    url: string;
    display_name?: string | null;
    description?: string | null;
    default_message?: string | null;
    display_order: number;
    metadata?: Record<string, unknown> | null;
  }>;
}

export interface LinktreeEditorSubmitData {
  is_default?: boolean;
  name: string;
  subtitle?: string;
  description?: string;
  slug: string;
  image: string | null;
  background_color: string;
  templateKey: TemplateKey;
  templateConfig: Record<string, unknown>;
  footer_text?: string;
  footer_phone?: string;
  footer_hidden?: boolean;
  platforms: string[];
  links: Record<string, string[]>;
  linkMetadata?: Record<
    string,
    Array<{
      display_name?: string;
      description?: string;
      default_message?: string;
      metadata?: Record<string, unknown>;
    }>
  >;
}
