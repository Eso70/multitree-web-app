"use client";

import { memo, useMemo, useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Search } from "lucide-react";
import { MotionPulseIcon } from "@/components/motion/MotionPrimitives";
import type { LinktreeListItem } from "@linktree/types";

export interface LinktreeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  items: LinktreeListItem[];
  onSelect: (item: LinktreeListItem) => void;
  publicPathPrefix?: string;
  actionLabel?: string;
}

export const LinktreeSearchModal = memo(function LinktreeSearchModal({
  isOpen,
  onClose,
  searchQuery,
  onSearchQueryChange,
  items = [],
  onSelect,
  publicPathPrefix = "/linktree",
  actionLabel = "دەستکاریکردن ←",
}: LinktreeSearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.uid.toLowerCase().includes(q) ||
        item.seo_name?.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="modal-ltr fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300">
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] overflow-hidden duration-200"
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
            placeholder="ناوی پەیج بنووسە بۆ گەڕان..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults.length > 0) {
                e.preventDefault();
                onSelect(searchResults[0]);
                onClose();
              }
            }}
            className="w-full pr-12 pl-14 py-4 text-sm sm:text-base bg-transparent focus:outline-none text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 font-kurdish text-left"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="داخستن"
          >
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-400 font-sans font-bold dark:bg-white/5">
              ESC
            </span>
          </button>
        </div>

        {/* Results Grid List */}
        <div
          className="max-h-[320px] overflow-y-auto p-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {!searchQuery.trim() ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-400 text-xs sm:text-sm font-kurdish flex flex-col items-center justify-center gap-2 select-none">
              <MotionPulseIcon>
                <Search
                  className="h-5 w-5 opacity-40"
                  style={{ color: "var(--theme-primary, #6366f1)" }}
                />
              </MotionPulseIcon>
              <span>گەڕان بۆ پەیجەکان بکە.....</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-400 text-sm font-kurdish">
              هیچ ئەنجامێک نەدۆزرایەوە بۆ &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-left transition-all duration-150 active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Item Image */}
                    <div className="relative w-10 h-10 overflow-hidden rounded-full border border-gray-200 dark:border-white/10 bg-slate-100 dark:bg-[#161B22] flex-shrink-0">
                      <Image
                        src={item.image || "/images/DefaultAvatar.png"}
                        alt={item.name}
                        fill
                        sizes="40px"
                        unoptimized
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/DefaultAvatar.png";
                        }}
                      />
                    </div>
                    {/* Name and UID slug */}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-100 transition-colors leading-tight">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-400 font-mono leading-none mt-1">
                        {publicPathPrefix}/{item.seo_name || item.uid}
                      </span>
                    </div>
                  </div>
                  {/* Action Trigger */}
                  <div
                    className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 pl-2"
                    style={{ color: "var(--theme-primary, #6366f1)" }}
                  >
                    {actionLabel}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
});
