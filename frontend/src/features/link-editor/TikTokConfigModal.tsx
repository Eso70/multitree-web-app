"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import { modalInputClass } from "./modal-input-styles";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";

interface TikTokConfigModalProps {
  isOpen: boolean;
  configs?: Array<{ pixel_id?: string | null; events_token?: string | null }> | null;
  onChange: (configs: Array<{ pixel_id: string; events_token: string }>) => void;
  onClose: () => void;
  maxConfigs?: number;
}

const emptyTikTokConfig = () => ({ pixel_id: "", events_token: "" });

export function TikTokConfigModal({
  isOpen,
  configs,
  onChange,
  onClose,
  maxConfigs = 3,
}: TikTokConfigModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setMounted(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useModalKeyboard({
    isOpen: isOpen && mounted,
    onEscape: onClose,
    onEnter: onClose,
  });

  if (!isOpen || !mounted) return null;

  const normalizedConfigs = Array.isArray(configs)
    ? configs.slice(0, maxConfigs).map((config) => ({
      pixel_id: config?.pixel_id ?? "",
      events_token: config?.events_token ?? "",
    }))
    : [];

  const visibleConfigs = normalizedConfigs.length > 0
    ? normalizedConfigs
    : [emptyTikTokConfig()];

  const updateConfig = (index: number, field: "pixel_id" | "events_token", value: string) => {
    const next = visibleConfigs.map((config) => ({ ...config }));
    next[index] = { ...(next[index] || emptyTikTokConfig()), [field]: value };
    onChange(next.slice(0, maxConfigs));
  };

  const addConfig = () => {
    if (visibleConfigs.length >= maxConfigs) return;
    onChange([...visibleConfigs, emptyTikTokConfig()]);
  };

  const removeConfig = (index: number) => {
    const next = visibleConfigs.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : []);
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-lg duration-300"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="modal-ltr fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[85vw] md:w-[75vw] max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white border border-gray-100/50 shadow-2xl duration-300"
        dir="ltr"
      >
        <div className="border-b border-gray-100/50">
          <div className="flex items-center justify-between p-3 sm:p-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-700">ڕێکخستنی تیکتۆک</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">هەر گرووپێک پێکدێت لە Pixel ID و Events API. زۆرترین ژمارە {maxConfigs} گرووپە.</p>
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

        <div className="overflow-y-auto p-3 sm:p-4 space-y-3" style={{ maxHeight: "calc(85vh - 130px)", scrollbarWidth: "thin", scrollbarColor: "rgba(156,163,175,0.5) transparent" }}>
          {visibleConfigs.map((config, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">گرووپی {index + 1}</span>
                {visibleConfigs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeConfig(index)}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    سڕینەوە
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Pixel ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={config.pixel_id}
                    onChange={(e) => updateConfig(index, "pixel_id", e.target.value)}
                    className={modalInputClass()}
                    placeholder="Pixel ID بنووسە"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Events API <span className="text-gray-400">(دڵخواز)</span></label>
                  <input
                    type="text"
                    value={config.events_token}
                    onChange={(e) => updateConfig(index, "events_token", e.target.value)}
                    className={modalInputClass()}
                    placeholder="توکنی Events API بنووسە"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100/50 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addConfig}
            disabled={visibleConfigs.length >= maxConfigs}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
          >
            <Plus className="h-4 w-4" />
            زیادکردنی گرووپ
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl text-white py-2.5 px-6 text-sm font-semibold shadow-lg hover:shadow-xl hover:opacity-90 transition-all duration-300"
            style={{ background: "var(--theme-css, #64748b)" }}
          >
            تەواو
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
