"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { modalChoiceButtonClass } from "@/features/link-editor/modal-input-styles";
import { backgroundStyleLabel } from "./mini-website-background-styles";
import { MiniWebsiteBackgroundStyleModal } from "./MiniWebsiteBackgroundStyleModal";
import type { MiniWebsiteBackgroundStyle } from "./types";

interface MiniWebsiteBackgroundStyleFieldProps {
  value: MiniWebsiteBackgroundStyle;
  onChange: (value: MiniWebsiteBackgroundStyle) => void;
}

/**
 * Trigger for the background-pattern picker, styled as the linktree editor's
 * template chooser so both editors present the same control. The label comes
 * from the surrounding field wrapper, so it matches whichever row it sits in.
 */
export function MiniWebsiteBackgroundStyleField({
  value,
  onChange,
}: MiniWebsiteBackgroundStyleFieldProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={modalChoiceButtonClass()}
        onClick={() => setIsPickerOpen(true)}
        type="button"
      >
        <span className="truncate text-gray-900 dark:text-gray-100">
          {backgroundStyleLabel(value)}
        </span>
        <Sparkles className="h-4 w-4 shrink-0 text-gray-500" />
      </button>

      <MiniWebsiteBackgroundStyleModal
        isOpen={isPickerOpen}
        onChange={onChange}
        onClose={() => setIsPickerOpen(false)}
        value={value}
      />
    </>
  );
}
