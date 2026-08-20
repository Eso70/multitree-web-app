import type { LinktreeEditorSubmitData } from "@/features/link-editor/editor-types";
import { normalizeTemplateConfig } from "@/lib/templates/config";

/** Converts editor state to the exact backend CreateLinktreeDto boundary. */
export function buildPlatformLinktreePayload(data: LinktreeEditorSubmitData) {
  return {
    name: data.name.trim(),
    subtitle: data.subtitle?.trim() || undefined,
    description: data.description?.trim() || undefined,
    seo_name: data.slug.trim(),
    image: data.image || undefined,
    background_color: data.background_color,
    template_config: normalizeTemplateConfig(
      data.templateKey,
      data.templateConfig,
    ),
    footer_text: data.footer_text?.trim() || undefined,
    footer_phone: data.footer_phone?.trim() || undefined,
    footer_hidden: data.footer_hidden ?? false,
    is_default: false,
    platforms: data.platforms,
    links: data.links,
    linkMetadata: data.linkMetadata,
  };
}
