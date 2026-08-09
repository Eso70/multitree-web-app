"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvertisingSelectionCheckProps {
  selected: boolean;
  selectedClassName?: string;
  compact?: boolean;
}

export function AdvertisingSelectionCheck({
  selected,
  selectedClassName = "border-[var(--advertising-accent)] bg-[var(--advertising-accent)] text-[var(--advertising-accent-ink)]",
  compact = false,
}: AdvertisingSelectionCheckProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-colors",
        compact ? "h-5 w-5" : "h-6 w-6",
        selected ? selectedClassName : "border-black/12 text-transparent dark:border-white/15",
      )}
    >
      <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
    </span>
  );
}
