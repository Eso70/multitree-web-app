"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  CopyPlus,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest, isApiRequestError } from "@/lib/api/request";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { Tooltip } from "@/components/shared/Tooltip";
import type { LinktreeListItem } from "@linktree/types";

interface DuplicateLinktreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLinktree: LinktreeListItem | null;
  onSuccess: () => void;
  apiBase?: string;
  checkSlugEndpoint?: string;
}

/**
 * Generates an initial slug suggestion for the modal based on the source slug.
 */
function suggestNextSlug(baseSlug: string): string {
  const trimmed = (baseSlug || "page").toLowerCase().trim();
  const copyNumbered = /^(.*?)-copy-(\d+)$/.exec(trimmed);
  const copyPlain = /^(.*?)-copy$/.exec(trimmed);
  const numbered = /^(.*?)-(\d+)$/.exec(trimmed);

  if (copyNumbered) {
    const next = parseInt(copyNumbered[2], 10) + 1;
    return `${copyNumbered[1]}-copy-${next}`;
  }
  if (copyPlain) {
    return `${copyPlain[1]}-copy-2`;
  }
  if (numbered) {
    const next = parseInt(numbered[2], 10) + 1;
    return `${numbered[1]}-${next}`;
  }
  return `${trimmed}-copy`;
}

export const DuplicateLinktreeModal = memo(function DuplicateLinktreeModal({
  isOpen,
  onClose,
  targetLinktree,
  onSuccess,
  apiBase = "/api/linktrees",
  checkSlugEndpoint,
}: DuplicateLinktreeModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check copy lineage and depth
  const currentDepth = useMemo(() => {
    if (!targetLinktree?.template_config) return 0;
    const config = targetLinktree.template_config as Record<string, unknown>;
    const lineage = config._copy_lineage as { depth?: number } | undefined;
    return typeof lineage?.depth === "number" ? lineage.depth : 0;
  }, [targetLinktree]);

  const isMaxDepthReached = currentDepth >= 3;

  // Initialize form fields whenever target linktree changes or modal opens
  useEffect(() => {
    if (isOpen && targetLinktree) {
      const initialSlug = suggestNextSlug(targetLinktree.seo_name || targetLinktree.uid || "");
      setName(targetLinktree.name || "");
      setSlug(initialSlug);
      setIsSlugAvailable(null);
      setSlugError(null);
    }
  }, [isOpen, targetLinktree]);

  // Debounced slug availability verification
  useEffect(() => {
    if (!isOpen || !slug.trim()) {
      setIsSlugAvailable(null);
      setSlugError(null);
      return;
    }

    const cleaned = slug.toLowerCase().trim();
    if (cleaned.length < 2) {
      setIsSlugAvailable(false);
      setSlugError("نازناو دەبێت لانی کەم ٢ پیت بێت");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(cleaned)) {
      setIsSlugAvailable(false);
      setSlugError("تەنها پیتی ئینگلیزی، ژمارە و هێڵی لاری کورت (-) ڕێگەپێدراون");
      return;
    }

    setIsCheckingSlug(true);
    setSlugError(null);

    const timer = setTimeout(async () => {
      try {
        const checkUrl = checkSlugEndpoint || `${apiBase}/check-slug`;
        const available = await apiRequest<boolean>(
          `${checkUrl}?slug=${encodeURIComponent(cleaned)}`,
        );
        const isAvail = available === true;
        setIsSlugAvailable(isAvail);
        if (!isAvail) {
          setSlugError("ئەم نازناوە پێشتر بەکارهاتووە");
        }
      } catch {
        // Fallback gracefully on network hiccup
        setIsSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, slug, apiBase, checkSlugEndpoint]);

  const handleSubmit = useCallback(async () => {
    if (!targetLinktree || isSubmitting || isMaxDepthReached) return;

    const trimmedName = name.trim();
    const trimmedSlug = slug.toLowerCase().trim();

    if (!trimmedSlug) {
      setSlugError("نازناوی بەستەر پێویستە");
      return;
    }

    if (slugError || isSlugAvailable === false) {
      toast.error("تکایە سەرەتا کێشەی نازناوەکە چارەسەر بکە");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`${apiBase}/${targetLinktree.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName || undefined,
          slug: trimmedSlug || undefined,
        }),
      });

      toast.success("پەڕەکە بە سەرکەوتوویی لەبەرگیرایەوە");
      onSuccess();
      onClose();
    } catch (err) {
      if (isApiRequestError(err, 403)) {
        toast.error(err.message || "گەیشتوویت بە ئەوپەڕی ژمارەی پەڕەکان بۆ ئەم پلانە");
      } else if (isApiRequestError(err, 409)) {
        toast.error("ئەم نازناوە پێشتر بەکارهاتووە، تکایە دانەیەکی تر هەڵبژێرە");
      } else if (err instanceof Error && err.message) {
        toast.error(err.message);
      } else {
        toast.error("هەڵەیەک ڕوویدا لە لەبەرگرتنەوەی پەڕەکە");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [targetLinktree, isSubmitting, name, slug, slugError, isSlugAvailable, onSuccess, onClose, apiBase, isMaxDepthReached]);

  useModalKeyboard({
    isOpen,
    onEscape: () => {
      if (!isSubmitting) onClose();
    },
    onEnter: handleSubmit,
    enterEnabled: !isSubmitting && isSlugAvailable !== false,
    escapeEnabled: !isSubmitting,
  });

  if (!isOpen || !targetLinktree) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm modal-ltr"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      dir="rtl"
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-white/10"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl shadow-xs"
              style={{
                background: "color-mix(in srgb, var(--theme-primary, #6366f1) 12%, transparent)",
                color: "var(--theme-primary, #6366f1)",
              }}
            >
              <CopyPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-gray-100 font-kurdish">
                لەبەرگرتنەوەی پەڕە
              </h3>
              <p className="text-xs text-slate-400 dark:text-gray-400 font-kurdish">
                دروستکردنی کۆپییەکی نوێ بە هەمان دیزاین و بەستەر
              </p>
            </div>
          </div>
          <Tooltip content="داخستن" side="bottom">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
              aria-label="داخستن"
            >
              <X className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 font-kurdish">
          {/* Source Page Card Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 bg-slate-200 dark:bg-slate-700">
              {targetLinktree.image ? (
                <Image
                  src={targetLinktree.image}
                  alt={targetLinktree.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <LinkIcon className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 dark:text-gray-500">پەڕەی سەرچاوە:</p>
              <p className="text-sm font-bold text-slate-700 dark:text-gray-200 truncate">
                {targetLinktree.name}
              </p>
              <p className="text-[11px] font-mono text-slate-400 truncate" dir="ltr">
                /{targetLinktree.seo_name || targetLinktree.uid}
              </p>
            </div>
          </div>

          {/* New Page Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
              ناوی پەڕەی نوێ
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="ناوی پەڕەکە بنووسە"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0D1117] text-slate-800 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary,#6366f1)]/20 focus:border-[var(--theme-primary,#6366f1)] transition-all disabled:opacity-50"
            />
          </div>

          {/* New Page Slug Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
              نازناوی بەستەر (Slug)
              <span style={{ color: "var(--theme-primary, #6366f1)" }} className="ms-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                disabled={isSubmitting}
                placeholder="my-new-page"
                dir="ltr"
                className={`w-full px-3.5 py-2.5 pe-10 text-sm font-mono rounded-xl border bg-white dark:bg-[#0D1117] text-slate-800 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                  slugError
                    ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
                    : isSlugAvailable
                    ? "border-emerald-500 focus:ring-emerald-500/20 focus:border-emerald-500"
                    : "border-slate-200 dark:border-white/10 focus:ring-[var(--theme-primary,#6366f1)]/20 focus:border-[var(--theme-primary,#6366f1)]"
                }`}
              />
              <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                {isCheckingSlug ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : isSlugAvailable ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : slugError ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            </div>

            {slugError ? (
              <p className="mt-1.5 text-[11px] text-red-500 font-semibold">
                {slugError}
              </p>
            ) : isSlugAvailable ? (
              <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                ئەم نازناوە بەردەستە
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">
                بەستەری گشتی ئەم پەڕەیە دەبێتە: /{slug || "..."}
              </p>
            )}
          </div>

          {isMaxDepthReached && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                ئەم پەڕەیە گەیشتووەتە ئەوپەڕی ئاستی لەبەرگرتنەوە (لانی زۆر ٣ ئاست). ناتوانیت کۆپیی تر لەم پەڕەیە دروست بکەیت.
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl transition-all border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 cursor-pointer"
            >
              پاشگەزبوونەوە
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isCheckingSlug || isSlugAvailable === false || isMaxDepthReached}
              className="flex-1 px-4 py-2.5 text-sm font-black rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.99]"
              style={{
                background: "var(--theme-css, var(--theme-primary, #6366f1))",
                color: "var(--theme-ink, #ffffff)",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>کۆپی دەکرێت...</span>
                </>
              ) : (
                <>
                  <CopyPlus className="h-4 w-4" />
                  <span>لەبەرگرتنەوە</span>
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
