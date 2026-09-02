"use client";

import { Clipboard } from "lucide-react";
import { toast } from "sonner";
import { EditorField } from "@/components/shared/EditorField";
import { Tooltip } from "@/components/shared/Tooltip";
import { ModalTextInput } from "@/components/shared/ModalTextInput";
import { copyToClipboard } from "@/lib/utils/clipboard";

export function CopyValueField({
  label,
  value,
  copyName,
  monospace = false,
  centered = false,
}: {
  label: string;
  value: string;
  copyName: string;
  monospace?: boolean;
  centered?: boolean;
}) {
  const copy = async () => {
    if (await copyToClipboard(value)) toast.success(`${copyName} کۆپی کرا`);
    else toast.error(`کۆپیکردنی ${copyName} سەرکەوتوو نەبوو`);
  };

  return (
    <EditorField label={label}>
      <div className="flex gap-2" dir="ltr">
        <ModalTextInput
          readOnly
          value={value}
          aria-label={label}
          className={`${monospace ? "font-mono font-bold tracking-wider" : "text-xs"} ${centered ? "text-center" : ""}`}
        />
        <Tooltip content={`کۆپیکردنی ${copyName}`} side="bottom">
          <button
            type="button"
            aria-label={`کۆپیکردنی ${copyName}`}
            onClick={() => void copy()}
            className="flex min-h-10 w-11 shrink-0 self-stretch items-center justify-center rounded-lg border border-slate-200 bg-white text-[var(--theme-primary)] shadow-sm transition hover:border-[var(--theme-primary)] hover:bg-[color-mix(in_srgb,var(--theme-primary)_8%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 dark:border-white/10 dark:bg-[#161B22] dark:hover:border-[var(--theme-primary)] sm:rounded-xl cursor-pointer"
          >
            <Clipboard className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </EditorField>
  );
}
