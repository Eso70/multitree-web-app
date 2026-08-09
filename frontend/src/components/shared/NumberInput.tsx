"use client";

import { useState } from "react";

interface NumberInputProps {
  value: number;
  onValueChange: (value: number) => void;
  /** Lower bound; also the value an emptied field falls back to on blur. Defaults to 0. */
  min?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  /**
   * Empties the field on focus so typing starts fresh, instead of the caret
   * landing inside the existing number and appending digits to it. The previous
   * value is restored on blur if nothing is typed.
   */
  clearOnFocus?: boolean;
}

/**
 * Numeric field shared by editor surfaces. Centralises the parse/clamp/empty
 * handling that was previously re-implemented inline next to every
 * `<input type="number">` (prices, durations, quotas).
 */
export function NumberInput({
  value,
  onValueChange,
  min = 0,
  step,
  className,
  placeholder,
  clearOnFocus = false,
  "aria-label": ariaLabel,
}: NumberInputProps) {
  // While focused the raw text is authoritative, so a half-typed or empty
  // field isn't fought by the numeric value flowing back down.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed)) return min;
    return Math.max(min, parsed);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      step={step}
      value={draft ?? String(value)}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      dir="ltr"
      onFocus={() => {
        if (clearOnFocus) setDraft("");
      }}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        onValueChange(commit(raw));
      }}
      onBlur={(event) => {
        onValueChange(commit(event.target.value));
        setDraft(null);
      }}
    />
  );
}
