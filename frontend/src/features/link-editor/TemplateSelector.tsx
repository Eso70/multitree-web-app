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
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: TemplateKey;
  onSelectTemplate: (template: TemplateKey) => void;
}) {
  const { isTemplateAllowed } = useTemplateAccess();

  return (
    <CompactTemplateSelectorModal
      isOpen={isOpen}
      onClose={onClose}
      templates={TEMPLATE_OPTIONS}
      selectedTemplate={selectedTemplate}
      onSelectTemplate={(templateId) =>
        onSelectTemplate(templateId as TemplateKey)
      }
      isAllowed={isTemplateAllowed}
    />
  );
});

TemplateSelector.displayName = "TemplateSelector";
