"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { COUNTRY_DIAL_CODES } from "@/lib/constants/country-codes";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Globe } from "lucide-react";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";

interface Country {
  code: string;
  name: string;
}

// 1. Memoized Country Button Component to prevent unnecessary re-renders
// Uses transform-gpu and content-visibility for maximum scrolling performance
const CountryButton = React.memo(({
  country,
  isSelected,
  onClick
}: {
  country: Country;
  isSelected: boolean;
  onClick: (code: string) => void;
}) => {
  return (
    <button
      type="button"
      onClick={() => onClick(country.code)}
      className={`w-full px-4 py-3 text-left text-sm transition-all duration-300 rounded-xl transform-gpu ${
        isSelected
          ? "shadow-md font-semibold border-l-4"
          : "text-slate-600 dark:text-gray-300 hover:bg-linear-to-r hover:from-slate-50 hover:to-gray-50 hover:text-slate-700 dark:hover:from-[#161B22] dark:hover:to-[#161B22] dark:hover:text-gray-150"
      }`}
      style={isSelected ? { backgroundColor: 'color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)', color: 'var(--theme-primary, #64748b)', borderColor: 'var(--theme-primary, #64748b)', contentVisibility: "auto", containIntrinsicSize: "46px" } : { contentVisibility: "auto", containIntrinsicSize: "46px" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-base">+{country.code}</span>
        <span className="text-slate-500 text-sm truncate flex-1 text-left">
          {country.name}
        </span>
      </div>
    </button>
  );
});

CountryButton.displayName = "CountryButton";

interface CountrySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Comprehensive list of countries with phone codes - Iraq first
const ALL_COUNTRIES: Country[] = [...COUNTRY_DIAL_CODES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function CountrySelector({
  value,
  onChange,
  className = "",
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Mount check for portal - use startTransition to avoid cascading renders
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Find selected country - default to Iraq (964)
  const selectedCountry = useMemo(() => {
    const code = value || "964";
    return ALL_COUNTRIES.find((c) => c.code === code) || ALL_COUNTRIES[0];
  }, [value]);

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return ALL_COUNTRIES;
    }
    const query = searchQuery.toLowerCase().trim();
    return ALL_COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.includes(query) ||
        `+${country.code}`.includes(query)
    );
  }, [searchQuery]);

  // Paginated/visible countries to render
  const renderedCountries = useMemo(() => {
    return filteredCountries.slice(0, visibleCount);
  }, [filteredCountries, visibleCount]);

  // Reset pagination when search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(40);
    // Scroll back to top of list when search changes
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  // High-performance Infinite Scroll using IntersectionObserver
  useEffect(() => {
    const container = listContainerRef.current;
    const sentinel = sentinelRef.current;
    
    if (!container || !sentinel || !isOpen || filteredCountries.length <= visibleCount) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 40, filteredCountries.length));
        }
      },
      {
        root: container,
        rootMargin: "150px", // Trigger preloading 150px before sentinel hits viewport
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [isOpen, filteredCountries.length, visibleCount]);

  // Handle country selection
  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Toggle modal
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery("");
    }
  };

  // Close modal
  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

  useModalKeyboard({
    isOpen,
    onEscape: handleClose,
    onEnter: () => {
      const firstCountry = filteredCountries[0];
      if (firstCountry) handleSelect(firstCountry.code);
    },
  });

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && mounted) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mounted]);

  if (!mounted) {
    return (
      <button
        type="button"
        className={`flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-linear-to-br from-white to-slate-50/50 dark:from-[#161B22] dark:to-[#161B22] px-3 py-2 text-sm text-slate-700 dark:text-gray-200 transition-all duration-300 hover:border-[var(--theme-primary,#64748b)] hover:shadow-md focus:border-[var(--theme-primary,#64748b)] focus:outline-none focus:ring-2 min-w-25 shadow-sm ${className}`} style={{ '--tw-ring-color': 'color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)' } as React.CSSProperties}
      >
        <span className="font-medium">+{value || "964"}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 dark:text-gray-500" />
      </button>
    );
  }

  const modalContent = isOpen ? (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-lg   duration-300"
        onClick={handleClose}
        aria-hidden
      />
      
      {/* Modal container - centered like template selector */}
      <div 
        className="modal-ltr fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-125 max-w-125 max-h-150 overflow-hidden rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-100/50 shadow-2xl    duration-300"
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100/50">
          <div className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2 shadow-sm border" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary, #64748b) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)' }}>
                <Globe className="h-4 w-4" style={{ color: 'var(--theme-primary, #64748b)' }} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-700">
                  وڵات هەڵبژێرە
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-primary, #64748b)' }}>
                  {ALL_COUNTRIES.length} وڵات
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-xl p-2 bg-linear-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-slate-500 hover:text-slate-700 transition-all duration-300 border border-slate-100 shadow-sm hover:shadow"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 sm:p-4 border-b border-gray-100/50 bg-linear-to-br from-white to-slate-50/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ناوی وڵات یان کۆد..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-300 shadow-sm hover:shadow-md"
              style={{ '--tw-ring-color': 'color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)' } as React.CSSProperties}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--theme-primary, #64748b)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = ''; }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors duration-300 z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Countries List */}
        <div 
          ref={listContainerRef}
          className="custom-scrollbar theme-custom-scrollbar overflow-y-auto p-2 bg-linear-to-br from-white to-slate-50/20 transform-gpu"
          style={{ 
            scrollbarWidth: "thin", 
            scrollbarColor: "var(--theme-primary, #64748b) transparent",
            maxHeight: "calc(600px - 180px)",
          }}
        >
          {filteredCountries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              هیچ وڵاتێک نەدۆزرایەوە
            </div>
          ) : (
            <div className="space-y-1">
              {renderedCountries.map((country) => (
                <CountryButton
                  key={country.code}
                  country={country}
                  isSelected={(value || "964") === country.code}
                  onClick={handleSelect}
                />
              ))}
            </div>
          )}

          {/* Sentinel Div observed by IntersectionObserver for scroll loading */}
          {filteredCountries.length > visibleCount && (
            <div 
              ref={sentinelRef}
              className="text-center text-xs text-slate-400 mt-2 py-3 border-t border-slate-100/30 flex justify-center items-center gap-2"
            >
              <MotionSpinner>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-slate-500" />
              </MotionSpinner>
              <span>وڵاتی زیاتر بار دەکرێت...</span>
            </div>
          )}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-linear-to-br from-white to-slate-50/50 dark:from-[#161B22] dark:to-[#161B22] px-3 py-2 text-sm text-slate-700 dark:text-gray-200 transition-all duration-300 hover:border-[var(--theme-primary,#64748b)] hover:shadow-md focus:border-[var(--theme-primary,#64748b)] focus:outline-none focus:ring-2 min-w-25 shadow-sm ${className}`} style={{ '--tw-ring-color': 'color-mix(in srgb, var(--theme-primary, #64748b) 30%, transparent)' } as React.CSSProperties}
      >
        <span className="font-medium">+{selectedCountry.code}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 dark:text-gray-500 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}


