"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X, Layout, Check, Sparkles } from "lucide-react";
import { LockedItemOverlay } from "@/components/shared/LockedContent";
import { useTemplateAccess } from "@/hooks/useTemplateAccess";
import { TEMPLATE_OPTIONS, type TemplateKey } from "@/lib/templates/config";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: TemplateKey;
  onSelectTemplate: (template: TemplateKey) => void;
}

// Compact template card - simple and small
const TemplateCard = memo(function TemplateCard({
  template,
  isSelected,
  onSelect,
  disabled,
}: {
  template: (typeof TEMPLATE_OPTIONS)[number];
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`group relative aspect-4/3 w-full overflow-hidden rounded-xl border-2 ${
        isSelected
          ? "shadow-lg"
          : "border-slate-200 hover:border-brand-500/40 hover:shadow-md"
      }`}
      animate={{ scale: isSelected ? 1.05 : 1 }}
      whileHover={disabled ? undefined : { scale: isSelected ? 1.05 : 1.02 }}
      style={isSelected ? { borderColor: 'var(--theme-primary, #64748b)', '--tw-ring-color': 'color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)' } as React.CSSProperties : undefined}
      aria-pressed={isSelected}
    >
      {/* Background gradient */}
      <div 
        className={`absolute inset-0 bg-linear-to-br ${template.previewGradient} transition-opacity duration-300 ${
          isSelected ? "opacity-95" : "opacity-70 group-hover:opacity-85"
        }`}
        aria-hidden
      />
      
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/25 to-transparent" aria-hidden />
      
      {/* Content - more compact */}
      <div className="relative flex flex-col items-center justify-center gap-1 p-1.5 sm:p-2 h-full">
        {/* Icon */}
        <div className={`rounded-lg p-1 sm:p-1.5 backdrop-blur-sm transition-all duration-300 shadow-sm ${
          isSelected 
            ? "bg-white/40 scale-110" 
            : "bg-white/15 group-hover:bg-white/25 group-hover:scale-105"
        }`}>
          <Layout className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
        </div>
        
        {/* Template name */}
        <span className={`text-[9px] sm:text-[10px] font-semibold text-white text-center transition-colors duration-300 leading-tight ${
          isSelected ? "text-brand-500/80" : ""
        }`}>
          {template.name}
        </span>
        
        {/* Selection checkmark */}
        {isSelected && (
          <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 rounded-full p-0.5 shadow-lg" style={{ background: 'var(--theme-css, #64748b)' }}>
            <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" strokeWidth={3} />
          </div>
        )}
        {disabled && <LockedItemOverlay compact roundedClassName="" />}
      </div>
    </motion.button>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.template.id === nextProps.template.id
  );
});

TemplateCard.displayName = "TemplateCard";

export const TemplateSelector = memo(function TemplateSelector({
  isOpen,
  onClose,
  selectedTemplate,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const { isTemplateAllowed } = useTemplateAccess();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

  const handleSelect = useCallback((templateId: TemplateKey) => {
    onSelectTemplate(templateId);
    onClose();
  }, [onSelectTemplate, onClose]);

  useModalKeyboard({
    isOpen: isOpen && mounted,
    onEscape: onClose,
    onEnter: () => {
      if (isTemplateAllowed(selectedTemplate)) handleSelect(selectedTemplate);
    },
  });

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop with blur */}
<motion.div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        aria-hidden
      />
      
      {/* Modal container - Smaller and fit to template count */}
      <motion.div
        className="modal-ltr fixed z-[201] top-1/2 left-1/2 w-[95vw] sm:w-[85vw] md:w-[75vw] max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-100/50 shadow-2xl"
        initial={{ opacity: 0, x: "-50%", y: "-50%", scale: 0.95 }}
        animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
        dir="ltr"
      >
        {/* Header - Compact */}
        <div className="border-b border-gray-100/50">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-xl p-1.5 sm:p-2 shadow-sm border" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)' }}>
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'var(--theme-primary, #64748b)' }} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-700">
                  شێوازی پەڕە هەڵبژێرە
                </h2>
                <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: 'var(--theme-primary, #64748b)' }}>
                  {TEMPLATE_OPTIONS.length} شێواز
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl p-1.5 sm:p-2 bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-500 hover:text-slate-700 transition-all duration-300 border border-slate-100 shadow-sm hover:shadow"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content - Compact and fit to templates */}
        <div 
          className="overflow-y-auto p-3 sm:p-4 flex items-center justify-center bg-linear-to-br from-white to-slate-50/20"
          style={{ 
            scrollbarWidth: "thin", 
            scrollbarColor: "rgba(156,163,175,0.5) transparent",
          }}
        >
          <div className="w-full">
            {/* Grid: 3 columns on mobile, 4 on tablet, 5 on desktop - fits 10 templates perfectly */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5 md:gap-3 justify-items-center">
              {TEMPLATE_OPTIONS.map((template, index) => (
                <motion.div
                  key={template.id}
                  className="w-full max-w-22.5 sm:max-w-23.75 md:max-w-25"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <TemplateCard
                    template={template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={() => handleSelect(template.id)}
                    disabled={!isTemplateAllowed(template.id)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );

  return createPortal(modalContent, document.body);
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.selectedTemplate === nextProps.selectedTemplate
  );
});

TemplateSelector.displayName = "TemplateSelector";
