"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { Loader2, Send } from "lucide-react";

const MESSAGE_MAX_LENGTH = 5000;
const COMPOSER_MAX_HEIGHT = 200;

export const ChatComposer = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder: string;
    sending: boolean;
    disabled?: boolean;
  }
>(function ChatComposer(
  { value, onChange, onSubmit, placeholder, sending, disabled },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [value]);

  const canSend = !sending && !disabled && value.trim().length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSubmit();
  };

  return (
    <div
      className={`flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 pr-2.5 shadow-sm transition focus-within:ring-2 dark:border-white/10 dark:bg-[#161B22] ${disabled ? "opacity-60" : ""}`}
      style={{ "--tw-ring-color": "var(--theme-primary)" } as React.CSSProperties}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || sending}
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder={placeholder}
        className="max-h-[200px] min-h-[24px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-200 dark:placeholder:text-slate-500"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSend}
        aria-label="ناردن"
        title="ناردن (Enter)"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none dark:disabled:bg-white/5 dark:disabled:text-slate-600"
        style={canSend ? { background: "var(--theme-css)", color: "var(--theme-ink)" } : undefined}
      >
        {sending ? (
          <MotionSpinner><Loader2 className="h-4 w-4 "  /></MotionSpinner>
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});
