"use client";

import { memo } from "react";
import { CompactTemplateSelectorModal } from "@/components/shared/CompactTemplateSelectorModal";
import { useTemplateAccess } from "@/hooks/useTemplateAccess";
import { TEMPLATE_OPTIONS, type TemplateKey } from "@/lib/templates/config";

export const TemplateSelector = memo(function TemplateSelector({
  isOpen,
  onClose,
  selectedTemplate,
  onSelectTemplate,
  allowedTemplateKeys,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: TemplateKey;
  onSelectTemplate: (template: TemplateKey) => void;
  /** Explicit access snapshot for non-account workflows such as a client invitation. */
  allowedTemplateKeys?: readonly TemplateKey[];
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
      onSelectTemplate={(templateId) =>
        onSelectTemplate(templateId as TemplateKey)
      }
      isAllowed={(templateKey) =>
        allowedTemplateKeys === undefined
          ? isTemplateAllowed(templateKey)
          : explicitAllowedKeys.has(templateKey as TemplateKey)
      }
    />
  );
});

TemplateSelector.displayName = "TemplateSelector";
