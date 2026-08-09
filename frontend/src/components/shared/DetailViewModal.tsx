"use client";

import { memo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import {
  MotionFade,
  MotionReveal,
} from "@/components/motion/MotionPrimitives";

export interface DetailField {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

interface DetailViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  footer?: React.ReactNode;
  zIndexClassName?: string;
  wide?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}

export const DetailViewModal = memo(function DetailViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  fields,
  footer,
  zIndexClassName = "z-[140]",
  wide = false,
  icon: Icon,
  iconClassName,
}: DetailViewModalProps) {
  useModalKeyboard({
    isOpen,
    onEscape: onClose,
    escapeEnabled: true,
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      className={`modal-ltr fixed inset-0 ${zIndexClassName} flex items-center justify-center p-2 sm:p-4`}
      onClick={handleBackdropClick}
      dir="ltr"
      data-multitree-theme
      style={{
        "--theme-primary": "var(--multitree-accent)",
        "--theme-css": "var(--multitree-accent)",
      } as React.CSSProperties}
    >
      {/* Backdrop */}
      <MotionFade
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose} 
      />

      <MotionReveal
        className={`
          relative z-10 w-full overflow-hidden rounded-2xl bg-white dark:bg-[#1c222b] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] selection:bg-lime-500/30 dark:selection:bg-lime-500/40
          ${wide ? "max-w-2xl" : "max-w-lg"}
        `}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 p-4 sm:p-5 md:p-6 bg-linear-to-r from-white to-slate-55/30 dark:from-[#1c222b] dark:to-slate-900/10" 
          dir="ltr"
        >
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <div className={`rounded-xl border p-2 shrink-0 ${iconClassName || "border-slate-200 bg-slate-50 text-slate-500"}`}>
                <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
            )}
            <div className="min-w-0">
              {subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-slate-400 font-kurdish truncate">
                  {subtitle}
                </p>
              )}
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-700 dark:text-gray-200 truncate font-kurdish mt-0.5 sm:mt-1">
                {title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex items-center justify-center rounded-xl p-2 bg-linear-to-br from-slate-50 to-gray-50 dark:from-white/5 dark:to-white/10 hover:from-slate-100 hover:to-gray-100 dark:hover:from-white/10 dark:hover:to-white/25 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-all duration-300 border border-slate-150 dark:border-white/10 shadow-sm hover:shadow cursor-pointer"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 bg-linear-to-br from-white to-slate-50/20 dark:from-[#1c222b] dark:to-slate-900/5 custom-scrollbar" 
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02] divide-y divide-slate-100 dark:divide-white/5">
            {fields.map((field, idx) => (
              field.fullWidth ? (
                <div 
                  key={idx} 
                  className="flex flex-col gap-1.5 px-4 py-3 text-left font-kurdish"
                >
                  <span className="font-semibold text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs uppercase tracking-wide">
                    {field.label}
                  </span>
                  <div className="break-words text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {field.value}
                  </div>
                </div>
              ) : (
                <div 
                  key={idx} 
                  className="flex items-center justify-between gap-3 px-4 py-3 text-xs sm:text-sm font-kurdish"
                >
                  <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">
                    {field.label}
                  </span>
                  <div className="min-w-0 text-right truncate font-medium text-slate-700 dark:text-slate-200" dir="ltr">
                    {field.value}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div 
            className="p-4 sm:p-5 md:p-6 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-linear-to-r from-slate-50/30 to-white dark:from-slate-900/10 dark:to-[#1c222b]"
          >
            {footer}
          </div>
        )}
      </MotionReveal>
    </div>,
    document.body
  );
});
