"use client";

import { ChevronDown, ChevronUp, CreditCard, Plus, Trash2 } from "lucide-react";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import {
  MiniWebsiteFieldLabel,
  shortMiniWebsiteLabel,
} from "./MiniWebsiteFieldLabel";

/**
 * The repeatable-row editor every list-style section is built from.
 *
 * Lives on its own rather than inside one section's file: reordering, removing
 * and the "add another" affordance have to behave identically everywhere, and a
 * section that copied them would drift the moment one copy was adjusted.
 */

export const miniWebsiteInputClass = modalInputClass(false, "h-11 py-0");
export const miniWebsiteTextareaClass = modalInputClass(false, "min-h-24 py-3");

type ItemWithId = { id: string };

export function CollectionEditor<T extends ItemWithId>({
  items,
  max,
  singular,
  emptyText,
  icon: Icon,
  error,
  setItems,
  createItem,
  children,
}: {
  items: T[];
  max: number;
  singular: string;
  emptyText: string;
  icon: typeof CreditCard;
  error?: string;
  setItems: (items: T[]) => void;
  createItem: () => T;
  children: (
    item: T,
    index: number,
    patch: (patch: Partial<T>) => void,
  ) => React.ReactNode;
}) {
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-[11px] font-bold text-red-500">{error}</p>}
      {items.map((item, index) => (
        <div key={item.id} className="mini-website-editor-item space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-black text-slate-500">
              {index + 1}
            </span>
            <span className="ml-auto flex items-center gap-0.5">
              <IconActionButton
                label="بردنە سەرەوە"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="بردنە خوارەوە"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوە"
                tone="danger"
                onClick={() =>
                  setItems(items.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>
          {children(item, index, (patch) =>
            setItems(
              items.map((current, itemIndex) =>
                itemIndex === index ? { ...current, ...patch } : current,
              ),
            ),
          )}
        </div>
      ))}
      {items.length < max && (
        <button
          type="button"
          onClick={() => setItems([...items, createItem()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          زیادکردنی {singular}
        </button>
      )}
      {!items.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Icon className="h-4 w-4 shrink-0" />
          {emptyText}
        </div>
      )}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  dir = "auto",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "auto" | "ltr" | "rtl";
  required?: boolean;
}) {
  return (
    <label>
      <MiniWebsiteFieldLabel
        required={required}
        className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300"
      >
        {label}
      </MiniWebsiteFieldLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={type === "url" ? 2048 : 240}
        placeholder={placeholder || `${shortMiniWebsiteLabel(label)} بنووسە`}
        className={miniWebsiteInputClass}
        dir={dir}
      />
    </label>
  );
}

export function DescriptionField({
  label = "وردەکاری",
  value,
  onChange,
  placeholder = "وردەکارییەکی کورت بنووسە",
  maxLength = 2000,
  required = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label>
      <MiniWebsiteFieldLabel
        required={required}
        className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300"
      >
        {label}
      </MiniWebsiteFieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={`${miniWebsiteTextareaClass} w-full resize-y`}
        dir="auto"
      />
    </label>
  );
}
