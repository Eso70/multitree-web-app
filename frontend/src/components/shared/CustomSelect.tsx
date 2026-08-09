"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface CustomSelectOption<T extends string> {
  value: T;
  label: string;
}

interface CustomSelectProps<T extends string> {
  label: string;
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  triggerClassName?: string;
  labelClassName?: string;
  fullWidth?: boolean;
  required?: boolean;
  showRequirement?: boolean;
}

export function CustomSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  hideLabel = false,
  triggerClassName,
  labelClassName,
  fullWidth = true,
  required = false,
  showRequirement = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) || options[0];
  const hasOptions = options.length > 0;

  const updateMenuPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const gap = 6;
    const estimatedMenuHeight = Math.min(176, options.length * 36 + 8);
    const shouldOpenUp =
      window.innerHeight - rect.bottom < estimatedMenuHeight + gap &&
      rect.top > estimatedMenuHeight + gap;

    setMenuPosition({
      left: rect.left,
      width: rect.width,
      ...(shouldOpenUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, [options.length]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  return (
    <div className="min-w-0 select-none">
      {!hideLabel && (
        <span
          className={`mb-1.5 block text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 ${labelClassName ?? ""}`}
        >
          {label}
          {showRequirement && (
            <span
              className="ms-1 font-bold normal-case"
              style={{ color: "var(--theme-primary, #64748b)" }}
            >
              {required ? "*" : "(ئارەزوومەندانە)"}
            </span>
          )}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || !hasOptions}
        onClick={() => {
          if (!hasOptions) return;
          if (!isOpen) updateMenuPosition();
          setIsOpen((current) => !current);
        }}
        className={`flex h-10 ${fullWidth ? "w-full" : "w-fit"} items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 outline-none transition hover:border-[var(--theme-primary,#64748b)] focus:border-[var(--theme-primary,#64748b)] focus:ring-2 focus:ring-[var(--theme-primary,#64748b)]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-[var(--theme-primary,#64748b)] dark:focus:border-[var(--theme-primary,#64748b)] ${triggerClassName ?? ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selected?.label ?? "هیچ هەڵبژاردەیەک نییە"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {hasOptions && isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="custom-scrollbar theme-custom-scrollbar fixed z-[150] max-h-44 select-none overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#1c222b]"
            style={menuPosition}
            role="listbox"
            dir="ltr"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                  option.value === value
                    ? "font-bold"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
                style={
                  option.value === value
                    ? {
                        background:
                          "color-mix(in srgb, var(--theme-primary, #64748b) 12%, transparent)",
                        color: "var(--theme-primary, #64748b)",
                      }
                    : undefined
                }
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
