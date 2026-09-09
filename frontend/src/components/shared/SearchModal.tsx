import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { MotionReveal } from "@/components/motion/MotionPrimitives";
import { Tooltip } from "@/components/shared/Tooltip";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder: string;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  children?: React.ReactNode;
  wide?: boolean;
  businessTheme?: boolean;
}

export function SearchModal({
  isOpen,
  onClose,
  placeholder,
  searchQuery,
  onSearchQueryChange,
  children,
  wide = false,
  businessTheme = false,
}: SearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="modal-ltr fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300"
      data-sponsor-krd-theme={businessTheme ? undefined : true}
      style={
        businessTheme
          ? undefined
          : ({
              "--theme-primary": "var(--sponsor-krd-accent)",
              "--theme-css": "var(--sponsor-krd-accent)",
            } as React.CSSProperties)
      }
    >
      <div className="fixed inset-0" onClick={onClose} />
      <MotionReveal
        ref={modalRef}
        className={`relative w-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-white/10 dark:bg-[#1c222b] selection:bg-brand-500/30 dark:selection:bg-brand-500/40 ${wide ? "max-w-2xl" : "max-w-lg"}`}
        dir="ltr"
      >
        {/* Search Input Box */}
        <div className="relative flex items-center border-b border-slate-100 bg-linear-to-r from-white to-slate-50/30 dark:border-white/5 dark:from-[#1c222b] dark:to-slate-900/10">
          <div className="absolute right-4 text-slate-400 dark:text-slate-400 pointer-events-none">
            <Search className="h-5 w-5" />
          </div>
          <input
            autoFocus
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onClose();
              }
            }}
            className={`w-full pr-12 py-4 text-sm sm:text-base bg-transparent focus:outline-none text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 font-kurdish text-left ${searchQuery ? "pl-32" : "pl-24"}`}
          />
          <div className="absolute left-4 flex items-center gap-1.5">
            {searchQuery && (
              <Tooltip content="پاککردنەوەی گەڕان" side="bottom">
                <button
                  type="button"
                  onClick={() => onSearchQueryChange("")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="جێبەجێکردن و داخستن" side="bottom">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
                aria-label="Apply and close"
              >
                <kbd className="block rounded border border-slate-200 px-2 py-1 font-sans text-[9px] font-bold text-slate-400 dark:border-white/10 dark:text-slate-400 dark:bg-white/5">
                  Enter
                </kbd>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Results List */}
        <div
          className={`custom-scrollbar brand-custom-scrollbar theme-custom-scrollbar overscroll-contain ${wide ? "max-h-[540px]" : "max-h-[320px]"} overflow-y-auto p-2`}
        >
          {children}
        </div>
      </MotionReveal>
    </div>,
    document.body,
  );
}
