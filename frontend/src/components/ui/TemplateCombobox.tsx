"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Check } from "lucide-react";
import { TEMPLATE_OPTIONS } from "@/lib/templates/config";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";

interface TemplateComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500 dark:[color-scheme:dark]";

export function TemplateCombobox({ value, onChange }: TemplateComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectedTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find(t => t.id === value),
    [value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return TEMPLATE_OPTIONS;
    const q = searchQuery.toLowerCase();
    return TEMPLATE_OPTIONS.filter(
      t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const frame = requestAnimationFrame(() => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = Math.min(320, spaceBelow - 8);

        setDropdownStyle({
          position: "fixed",
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          zIndex: 200,
          maxHeight: `${dropdownHeight}px`,
        });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    const frame = requestAnimationFrame(() => setActiveIndex(0));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Click-outside detection — no backdrop, page stays scrollable
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      if (isOutsideDropdown && isOutsideTrigger) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, [isOpen]);

  // Reposition on scroll (keep the dropdown following the trigger)
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = Math.min(320, spaceBelow - 8);
        setDropdownStyle(prev => ({
          ...prev,
          top: `${rect.bottom + 4}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          maxHeight: `${dropdownHeight}px`,
        }));
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen]);

  const handleSelect = useCallback((id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery("");
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev + 1 < filteredOptions.length ? prev + 1 : 0;
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
        itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT") {
      e.preventDefault();
      if (filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex].id);
      }
    }
  }, [filteredOptions, activeIndex, handleSelect]);

  useModalKeyboard({
    isOpen,
    onEscape: () => { setIsOpen(false); setSearchQuery(""); },
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`${inputClass} flex items-center justify-between gap-2`}
        style={isOpen ? { borderColor: "var(--theme-primary, #64748b)", "--tw-ring-color": "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)" } as React.CSSProperties : undefined}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedTemplate?.name || value}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={dropdownRef}
          className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1c222b]"
          style={dropdownStyle}
          role="listbox"
          dir="ltr"
        >
            {/* Search */}
            <div className="shrink-0 border-b border-slate-100 p-2 dark:border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setActiveIndex(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="گەڕان بە ناوی تێمپلەیت..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:border-white/10 dark:bg-[#161B22] dark:text-slate-200 dark:placeholder:text-slate-500"
                  style={{ "--tw-ring-color": "color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)" } as React.CSSProperties}
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>

            {/* List */}
            <div
              ref={listRef}
              className="overflow-y-auto p-1"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(156,163,175,0.5) transparent" }}
            >
              {filteredOptions.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No templates found</div>
              ) : (
                filteredOptions.map((template, index) => {
                  const isSelected = value === template.id;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={template.id}
                      ref={el => { itemRefs.current[index] = el; }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(template.id)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        isSelected
                          ? "font-semibold"
                          : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                      }`}
                      style={isSelected && !isActive ? {
                        backgroundColor: "color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)",
                        color: "var(--theme-primary, #64748b)",
                      } : isActive ? {
                        backgroundColor: "color-mix(in srgb, var(--theme-primary, #64748b) 6%, transparent)",
                      } : undefined}
                    >
                      <span className={`h-7 w-7 shrink-0 rounded-lg bg-linear-to-br ${template.previewGradient} shadow-sm`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{template.name}</div>
                        <div className="truncate text-xs text-slate-400 dark:text-slate-500">{template.description}</div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
        document.body
      )}
    </>
  );
}
