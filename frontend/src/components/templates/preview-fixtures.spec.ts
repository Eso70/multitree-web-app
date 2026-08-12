import { describe, expect, it } from "vitest";
import { TEMPLATE_OPTIONS, type TemplateKey } from "@/lib/templates/config";
import { createLinktreeTemplatePreview } from "./preview-fixtures";

describe("linktree template preview fixtures", () => {
  it("includes a subtitle in every template catalog preview", () => {
    for (const template of TEMPLATE_OPTIONS) {
      const preview = createLinktreeTemplatePreview({
        templateId: template.id as TemplateKey,
      });

      expect(preview.name).toBe("MultiTree");
      expect(preview.subtitle).toBe("Digital Presence Platform");
    }
  });
});
