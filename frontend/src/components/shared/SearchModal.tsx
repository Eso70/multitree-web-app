import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { MotionReveal } from "@/components/motion/MotionPrimitives";

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
      className="modal-ltr fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      data-multitree-theme={businessTheme ? undefined : true}
      style={
        businessTheme
          ? undefined
          : ({
              "--theme-primary": "var(--multitree-accent)",
              "--theme-css": "var(--multitree-accent)",
            } as React.CSSProperties)
      }
    >
      <div className="fixed inset-0" onClick={onClose} />
      <MotionReveal
        ref={modalRef}
        className={`relative w-full rounded-2xl bg-white/95 dark:bg-[#161B22]/95 border border-gray-200/80 dark:border-white/10 shadow-2xl overflow-hidden ${businessTheme ? "selection:bg-brand-500/30 dark:selection:bg-brand-500/40" : "selection:bg-lime-500/30 dark:selection:bg-lime-500/40"} ${wide ? "max-w-2xl" : "max-w-lg"}`}
        dir="ltr"
      >
        {/* Search Input Box */}
        <div className="relative flex items-center border-b border-gray-100 dark:border-white/10">
          <div className="absolute right-4 text-slate-400 dark:text-gray-555 pointer-events-none">
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
            className={`w-full pr-12 py-4 text-sm sm:text-base bg-transparent focus:outline-none text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-550 font-kurdish text-left ${searchQuery ? "pl-32" : "pl-24"}`}
          />
          <div className="absolute left-4 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-650 dark:hover:bg-white/5 dark:hover:text-gray-300"
              aria-label="Apply and close"
              title="Apply and close"
            >
              <kbd className="block rounded border border-gray-200 px-2 py-1 font-sans text-[9px] font-bold text-slate-400 dark:border-white/10 dark:text-gray-500">
                Enter
              </kbd>
            </button>
          </div>
        </div>

        {/* Results List */}
        <div
          className={`custom-scrollbar lime-custom-scrollbar theme-custom-scrollbar overscroll-contain ${wide ? "max-h-[540px]" : "max-h-[320px]"} overflow-y-auto p-2`}
        >
          {children}
        </div>
      </MotionReveal>
    </div>,
    document.body,
  );
}
