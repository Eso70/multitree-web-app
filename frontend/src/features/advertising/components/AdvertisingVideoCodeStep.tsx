"use client";

import { useRef } from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { AdvertisingVideoPlayer } from "./AdvertisingVideoPlayer";

/** TikTok Spark Ads video (authorization) code: "#" + 63 base64 characters + "=" padding. */
export const TIKTOK_VIDEO_CODE_PATTERN = /^#[A-Za-z0-9+/]{63}=$/;

interface AdvertisingVideoCodeStepProps {
  videoCode: string;
  onVideoCodeChange: (code: string) => void;
  videoSrc?: string;
  tutorialSteps: string[];
  /** Optional heading above the tutorial. */
  title?: string;
}

export function AdvertisingVideoCodeStep({
  videoCode,
  onVideoCodeChange,
  videoSrc,
  tutorialSteps,
  title,
}: AdvertisingVideoCodeStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedCode = videoCode.trim();
  const isInvalid = trimmedCode.length > 0 && !TIKTOK_VIDEO_CODE_PATTERN.test(trimmedCode);
  const heading = title?.trim();

  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard?.readText?.();
      if (!text) throw new Error("empty clipboard");
      onVideoCodeChange(text);
      toast.success("کۆد لکرا");
    } catch {
      inputRef.current?.focus();
      toast.error("لکردن سەرکەوتوو نەبوو، بە دەست بنووسە");
    }
  };

  return (
    <div className="grid w-full grid-cols-2 items-start gap-3 sm:gap-6">
      <div className="relative mx-auto w-[130px] max-w-full sm:w-[150px] lg:w-[190px]">
        <PhoneMockup ariaLabel="ڤیدیۆی فێرکردنی وەرگرتنی کۆدی تیکتۆک" name="Tutorial">
          <AdvertisingVideoPlayer size="compact" src={videoSrc} />
        </PhoneMockup>
        <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40 sm:mt-3 sm:text-[10px]">
          ترەیلەرەکە لێرە ببینە
        </p>
      </div>

      <div className="mx-auto flex w-full min-w-0 flex-col gap-3">
        {heading && (
          <h3 className="text-sm font-black text-slate-900 dark:text-white sm:text-lg" dir="auto">
            {heading}
          </h3>
        )}

        <ol className="flex flex-col gap-1.5 sm:gap-2.5">
          {tutorialSteps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-2 text-[11px] leading-5 text-black/60 dark:text-white/60 sm:gap-2.5 sm:text-sm sm:leading-6"
              dir="rtl"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/12 text-[9px] font-black text-cyan-700 dark:text-cyan-300 sm:h-5 sm:w-5 sm:text-[10px]">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div>
          <label htmlFor="video-code" className="mb-1.5 block text-xs font-bold text-black/60 dark:text-white/60">
            کۆدی ڤیدیۆ
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="video-code"
              type="text"
              dir="ltr"
              value={videoCode}
              onChange={(event) => onVideoCodeChange(event.target.value)}
              placeholder="#kZ4c...=="
              aria-invalid={isInvalid}
              className={cn(
                "w-full rounded-2xl border bg-white px-4 py-3 pe-11 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-white/[0.03] dark:text-white",
                isInvalid
                  ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  : "border-black/10 focus:border-cyan-400 focus:ring-cyan-400/20 dark:border-white/10",
              )}
            />
            <button
              type="button"
              onClick={pasteCode}
              aria-label="لکردنی کۆد لە کلیپبۆرد"
              title="لکردن"
              className="absolute inset-y-0 end-1.5 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-black/40 transition-colors hover:bg-black/[0.06] hover:text-black/70 dark:text-white/40 dark:hover:bg-white/[0.1] dark:hover:text-white/80"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>
          {isInvalid && (
            <p className="mt-1 text-[11px] font-bold text-red-500 dark:text-red-400" dir="auto">
              کۆدەکە دروست نییە. تکایە کۆدی ڕاستی سپارک ئادسی تیکتۆک بنووسە
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
