"use client";

import {
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  Plus,
  Trash2,
} from "lucide-react";
import {
  MINI_WEBSITE_MAX_OWNED_PROPERTIES,
  createMiniWebsiteOwnedProperty,
  type MiniWebsiteOwnedProperty,
  type MiniWebsiteOwnedPropertyType,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import {
  detectOwnedPropertyType,
  OWNED_PROPERTY_TYPE_LABELS,
  ownedPropertyButtonLabel,
} from "./owned-property-links";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

function featuredLabel(type: MiniWebsiteOwnedPropertyType) {
  if (type === "facebook")
    return "پۆستی گشتی Facebook (ئارەزوومەندانە)";
  if (type === "instagram")
    return "پۆست یان ڕیلی گشتی Instagram (ئارەزوومەندانە)";
  if (type === "youtube")
    return "ڤیدیۆ یان لیستی پەخشکردنی YouTube (ئارەزوومەندانە)";
  return "لینکی ناوەڕۆکی گشتی هەڵبژێردراو (ئارەزوومەندانە)";
}

export function MiniWebsiteOwnedPropertiesFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const items = draft.ownedProperties;
  const setItems = (ownedProperties: MiniWebsiteOwnedProperty[]) =>
    onChange({ ...draft, ownedProperties });
  const patchAt = (index: number, patch: Partial<MiniWebsiteOwnedProperty>) =>
    setItems(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  return (
    <div className="space-y-4">
      {errors.ownedProperties && (
        <p className="text-[11px] font-bold text-red-500">
          {errors.ownedProperties}
        </p>
      )}

      {items.map((item, index) => (
        <div
          key={item.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
              <Crown className="h-4 w-4" />
            </span>
            <span className="text-xs font-black text-slate-400">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناو
              </span>
              <input
                required
                value={item.name}
                onChange={(event) =>
                  patchAt(index, { name: event.target.value })
                }
                maxLength={240}
                placeholder="ناوی براند، کۆمپانیا، پەڕە یان کەناڵ"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                پەیوەندی
              </span>
              <input
                required
                value={item.relationship}
                onChange={(event) =>
                  patchAt(index, { relationship: event.target.value })
                }
                maxLength={160}
                placeholder="خاوەن، دامەزرێنەر، دروستکەر، بەڕێوەبەر..."
                className={inputClass}
                dir="auto"
              />
            </label>
            <CustomSelect<MiniWebsiteOwnedPropertyType>
              label="جۆر"
              required
              showRequirement
              value={item.propertyType}
              onChange={(propertyType) => patchAt(index, { propertyType })}
              options={(
                Object.entries(OWNED_PROPERTY_TYPE_LABELS) as [
                  MiniWebsiteOwnedPropertyType,
                  string,
                ][]
              ).map(([value, label]) => ({ value, label }))}
              triggerClassName="h-11"
              labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
            />
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ساڵی دامەزراندن
              </span>
              <input
                value={item.foundedYear}
                onChange={(event) =>
                  patchAt(index, { foundedYear: event.target.value })
                }
                maxLength={40}
                placeholder="٢٠٢٢ (ئارەزوومەندانە)"
                className={inputClass}
                dir="auto"
              />
            </label>
          </div>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              وردەکاری
            </span>
          <textarea
            value={item.description}
            onChange={(event) =>
              patchAt(index, { description: event.target.value })
            }
            maxLength={2000}
            placeholder="وردەکارییەکی کورت دەربارەی کاری ئەم براند، پەڕە یان کەناڵە"
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              لینکی فەرمی
            </span>
            <input
              required
              value={item.url}
              onChange={(event) => {
                const url = event.target.value;
                const detected = detectOwnedPropertyType(url);
                patchAt(index, {
                  url,
                  ...(detected ? { propertyType: detected } : {}),
                });
              }}
              maxLength={2048}
              placeholder="https://..."
              className={inputClass}
              dir="ltr"
            />
            <span className="mt-1 block text-[10px] text-slate-400">
              جۆر و دوگمەی گشتی بە شێوەی خۆکار لەم لینکەوە دەناسرێنەوە.
              دوگمەی ئێستا:{" "}
              {ownedPropertyButtonLabel(item.propertyType)}
            </span>
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              {featuredLabel(item.propertyType)}
            </span>
            <input
              value={item.featuredUrl}
              onChange={(event) =>
                patchAt(index, { featuredUrl: event.target.value })
              }
              maxLength={2048}
              placeholder="https://..."
              className={inputClass}
              dir="ltr"
            />
          </label>

          <MediaUpload
            label="لۆگۆ یان وێنەی بەرگ"
            wide
            value={item.image ? [item.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          {errors[`ownedProperty.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`ownedProperty.${index}`]}
            </p>
          )}
        </div>
      ))}

      {items.length < MINI_WEBSITE_MAX_OWNED_PROPERTIES && (
        <button
          type="button"
          onClick={() => setItems([...items, createMiniWebsiteOwnedProperty()])}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          زیادکردنی براند یان پەڕەی خاوەندارێتی
        </button>
      )}

      {!items.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Building2 className="h-4 w-4 shrink-0" />
          یەکەم براند، بازرگانی، پەڕە یان کەناڵ زیاد بکە.
        </div>
      )}
    </div>
  );
}
