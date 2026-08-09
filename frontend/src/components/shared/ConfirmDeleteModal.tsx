"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { memo } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loadingLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
  zIndexClassName?: string;
  tone?: "danger" | "accent";
}

export const ConfirmDeleteModal = memo(function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "\u0633\u0695\u06cc\u0646\u06d5\u0648\u06d5",
  loadingLabel = "\u062f\u06d5\u0633\u0695\u06ce\u062a\u06d5\u0648\u06d5...",
  cancelLabel = "\u067e\u0627\u0634\u06af\u06d5\u0632\u0628\u0648\u0648\u0646\u06d5\u0648\u06d5",
  isDeleting = false,
  zIndexClassName = "z-50",
  tone = "danger",
}: ConfirmDeleteModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isDeleting) onClose();
  };

  useModalKeyboard({
    isOpen,
    onEscape: () => {
      if (!isDeleting) onClose();
    },
    onEnter: handleConfirm,
    enterEnabled: !isDeleting,
    escapeEnabled: !isDeleting,
  });

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-ltr fixed inset-0 ${zIndexClassName} flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm`}
      onClick={handleBackdropClick}
      dir="ltr"
      data-multitree-theme
      style={
        {
          "--theme-primary": "var(--multitree-accent)",
          "--theme-css": "var(--multitree-accent)",
        } as React.CSSProperties
      }
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl
          bg-white dark:bg-[#161B22]
          border border-slate-200 dark:border-white/10
          selection:bg-lime-500/30 dark:selection:bg-lime-500/40
        "
      >
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-850 dark:text-gray-100 font-kurdish">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-655 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
            aria-label="داخستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="text-sm sm:text-base text-slate-600 dark:text-gray-350 leading-relaxed text-left font-kurdish">
            {message}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl transition-all border cursor-pointer text-center font-kurdish
                border-slate-200 dark:border-white/10
                text-slate-600 dark:text-gray-300
                hover:bg-slate-50 dark:hover:bg-white/5
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className={`
                flex-1 px-4 py-3 text-sm font-semibold transition-all rounded-xl cursor-pointer font-kurdish shadow-sm backdrop-blur-md
                active:scale-[0.99]
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                ${tone === "accent" ? "bg-[var(--multitree-accent)] text-[var(--multitree-accent-ink)] hover:brightness-95 shadow-[color-mix(in_srgb,var(--multitree-accent)_18%,transparent)]" : "bg-red-500/18 text-red-600 shadow-red-500/10 hover:bg-red-500/28 hover:text-red-700 hover:shadow-md hover:shadow-red-500/15 dark:bg-red-500/16 dark:text-red-200 dark:hover:bg-red-500/26 dark:hover:text-red-100"}
              `}
            >
              {isDeleting ? (
                <>
                  <MotionSpinner><Loader2 className="h-5 w-5 "  /></MotionSpinner>
                  <span>{loadingLabel}</span>
                </>
              ) : (
                <>
                  {tone === "accent" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  <span>{confirmLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
});
