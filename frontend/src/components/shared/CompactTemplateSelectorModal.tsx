"use client";

import {
  memo,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Check, Layout, Sparkles, X } from "lucide-react";
import { LockedItemOverlay } from "@/components/shared/LockedContent";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";

export type CompactTemplateOption = {
  id: string;
  name: string;
  previewGradient: string;
};

const CompactTemplateCard = memo(function CompactTemplateCard({
  template,
  selected,
  disabled,
  onSelect,
}: {
  template: CompactTemplateOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-label={template.name}
      aria-pressed={selected}
      className={`group relative aspect-4/3 w-full overflow-hidden rounded-xl border-2 ${selected ? "shadow-lg" : "border-slate-200 hover:border-brand-500/40 hover:shadow-md"}`}
      animate={{ scale: selected ? 1.05 : 1 }}
      whileHover={disabled ? undefined : { scale: selected ? 1.05 : 1.02 }}
      style={
        selected
          ? ({
              borderColor: "var(--theme-primary, #64748b)",
              "--tw-ring-color":
                "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
            } as CSSProperties)
          : undefined
      }
    >
      <div
        className={`absolute inset-0 bg-linear-to-br ${template.previewGradient} transition-opacity duration-300 ${selected ? "opacity-95" : "opacity-70 group-hover:opacity-85"}`}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-linear-to-t from-black/50 via-black/25 to-transparent"
        aria-hidden
      />
      <div className="relative flex h-full flex-col items-center justify-center gap-1 p-1.5 sm:p-2">
        <div
          className={`rounded-lg p-1 shadow-sm backdrop-blur-sm transition-all duration-300 sm:p-1.5 ${selected ? "scale-110 bg-white/40" : "bg-white/15 group-hover:scale-105 group-hover:bg-white/25"}`}
        >
          <Layout className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3" />
        </div>
        <span className="text-center text-[9px] font-semibold leading-tight text-white sm:text-[10px]">
          {template.name}
        </span>
        {selected ? (
          <div
            className="absolute right-0.5 top-0.5 rounded-full p-0.5 shadow-lg sm:right-1 sm:top-1"
            style={{ background: "var(--theme-css, #64748b)" }}
          >
            <Check
              className="h-2 w-2 text-white sm:h-2.5 sm:w-2.5"
              strokeWidth={3}
            />
          </div>
        ) : null}
        {disabled ? <LockedItemOverlay compact roundedClassName="" /> : null}
      </div>
    </motion.button>
  );
});

export function CompactTemplateSelectorModal({
  isOpen,
  onClose,
  templates,
  selectedTemplate,
  onSelectTemplate,
  isAllowed,
}: {
  isOpen: boolean;
  onClose: () => void;
  templates: readonly CompactTemplateOption[];
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  isAllowed: (templateId: string) => boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectTemplate = useCallback(
    (templateId: string) => {
      onSelectTemplate(templateId);
      onClose();
    },
    [onClose, onSelectTemplate],
  );

  useModalKeyboard({
    isOpen: isOpen && mounted,
    onEscape: onClose,
    onEnter: () => {
      if (isAllowed(selectedTemplate)) selectTemplate(selectedTemplate);
    },
  });

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      <motion.div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-selector-title"
        className="modal-ltr fixed left-1/2 top-1/2 z-[201] max-h-[85vh] w-[95vw] max-w-2xl overflow-hidden rounded-2xl border border-gray-100/50 bg-white/95 shadow-2xl backdrop-blur-sm sm:w-[85vw] md:w-[75vw]"
        initial={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.95 }}
        animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
        dir="ltr"
      >
        <div className="border-b border-gray-100/50">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="rounded-xl border p-1.5 shadow-sm sm:p-2"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)",
                }}
              >
                <Sparkles
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  style={{ color: "var(--theme-primary, #64748b)" }}
                />
              </div>
              <div>
                <h2
                  id="template-selector-title"
                  className="text-base font-bold text-slate-700 sm:text-lg"
                >
                  شێوازی پەڕە هەڵبژێرە
                </h2>
                <p
                  className="mt-0.5 text-[10px] sm:text-xs"
                  style={{ color: "var(--theme-primary, #64748b)" }}
                >
                  {templates.length} شێواز
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50 to-gray-50 p-1.5 text-slate-500 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:text-slate-700 hover:shadow sm:p-2"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div
          className="flex items-center justify-center overflow-y-auto bg-linear-to-br from-white to-slate-50/20 p-3 sm:p-4"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(156,163,175,0.5) transparent",
          }}
        >
          <div className="w-full">
            <div className="grid grid-cols-3 justify-items-center gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5 md:gap-3">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  className="w-full max-w-22.5 sm:max-w-23.75 md:max-w-25"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <CompactTemplateCard
                    template={template}
                    selected={selectedTemplate === template.id}
                    disabled={!isAllowed(template.id)}
                    onSelect={() => selectTemplate(template.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
