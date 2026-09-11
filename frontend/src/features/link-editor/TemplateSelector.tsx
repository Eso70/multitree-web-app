"use client";

import { memo } from "react";
import { CompactTemplateSelectorModal } from "@/components/shared/CompactTemplateSelectorModal";
import { useTemplateAccess } from "@/hooks/useTemplateAccess";
import { TEMPLATE_OPTIONS } from "@/lib/templates/config";

export const TemplateSelector = memo(function TemplateSelector({
  isOpen,
  onClose,
  selectedTemplate,
  onSelectTemplate,
  allowedTemplateKeys,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: string;
  onSelectTemplate: (template: string) => void;
  /** Explicit access snapshot for workflows without a signed-in business. */
  allowedTemplateKeys?: readonly string[];
}) {
  const { isTemplateAllowed } = useTemplateAccess(
    allowedTemplateKeys === undefined,
  );
  const explicitAllowedKeys = new Set(allowedTemplateKeys);

  return (
    <CompactTemplateSelectorModal
      isOpen={isOpen}
      onClose={onClose}
      templates={TEMPLATE_OPTIONS}
      selectedTemplate={selectedTemplate}
      onSelectTemplate={onSelectTemplate}
      isAllowed={(templateKey) =>
        allowedTemplateKeys === undefined
          ? isTemplateAllowed(templateKey)
          : explicitAllowedKeys.has(templateKey)
      }
    />
  );
});

TemplateSelector.displayName = "TemplateSelector";
