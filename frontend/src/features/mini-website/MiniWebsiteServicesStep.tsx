"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_ACTION_TYPES,
  MINI_WEBSITE_MAX_SERVICES,
  createMiniWebsiteService,
  type MiniWebsiteActionType,
  type MiniWebsiteService,
} from "@linktree/types";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { StandardPlatformInput } from "@/features/link-editor/components/StandardPlatformInput";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import {
  ACTION_LABEL_DEFAULTS,
  actionInputPlatform,
  isDefaultActionLabel,
} from "./service-action";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

// One height for every control on a card — the inputs, the select and the
// number field with its country code all sit on the same line.
const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

/** How the button reaches the business, in the words a business would use. */
const ACTION_TYPE_LABELS: Record<MiniWebsiteActionType, string> = {
  none: "بێ دوگمە",
  whatsapp: "واتساپ",
  phone: "پەیوەندی تەلەفۆنی",
  link: "لینک",
};

/**
 * The offers list: what the business sells.
 *
 * Clicks are reported with the page's own TikTok event. The row can carry one
 * of its own — the column and the renderer both support it — but choosing it
 * per offer is not exposed yet.
 */
export function MiniWebsiteServicesFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const services = draft.services;

  const setServices = (next: MiniWebsiteService[]) =>
    onChange({ ...draft, services: next });

  const patchAt = (index: number, patch: Partial<MiniWebsiteService>) =>
    setServices(
      services.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const next = [...services];
    [next[index], next[target]] = [next[target], next[index]];
    setServices(next);
  };

  return (
    <div className="space-y-4">
      {errors.services && (
        <p className="text-[11px] font-bold text-red-500">{errors.services}</p>
      )}

      {services.map((service, index) => (
        <div
          key={service.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1">
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناو
              </MiniWebsiteFieldLabel>
            <input
              required
              value={service.title}
              onChange={(event) => patchAt(index, { title: event.target.value })}
              maxLength={240}
              placeholder="ناوی خزمەتگوزاری یان بەرهەم"
              aria-label={`ناوی خزمەتگوزاری ${index + 1}`}
              className={`${inputClass} min-w-0 flex-1`}
              dir="auto"
            />
            </label>
            <span className="flex shrink-0 items-center gap-0.5">
              <IconActionButton
                label="بردنە سەرەوە"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="بردنە خوارەوە"
                disabled={index === services.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوەی خزمەتگوزاری"
                tone="danger"
                onClick={() =>
                  setServices(
                    services.filter((_, entryIndex) => entryIndex !== index),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              وردەکاری
            </span>
          <textarea
            value={service.description}
            onChange={(event) =>
              patchAt(index, { description: event.target.value })
            }
            maxLength={2000}
            placeholder="وردەکاری کورت (ئارەزوومەندانە)"
            aria-label={`وردەکاری خزمەتگوزاری ${index + 1}`}
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                نرخ
              </span>
              <input
                value={service.price}
                onChange={(event) => patchAt(index, { price: event.target.value })}
                maxLength={80}
                placeholder="٢٥,٠٠٠ د.ع یان بەپێی داواکاری"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دەقی دوگمە
              </span>
              <input
                value={service.actionLabel}
                onChange={(event) =>
                  patchAt(index, { actionLabel: event.target.value })
                }
                maxLength={120}
                placeholder={ACTION_LABEL_DEFAULTS[service.actionType] || "دەقی دوگمە"}
                aria-label={`دەقی دوگمەی خزمەتگوزاری ${index + 1}`}
                className={inputClass}
                dir="auto"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                جۆری دوگمە
              </MiniWebsiteFieldLabel>
              <CustomSelect
                label="جۆری دوگمە"
                hideLabel
                // Matches the text inputs; the select is a shorter control by
                // default and the row read as ragged next to them.
                triggerClassName="h-11 text-xs sm:text-sm"
                value={service.actionType}
                onChange={(value) =>
                  patchAt(index, {
                    actionType: value,
                    // The value means something different per type — a number
                    // is not an address — so it is cleared rather than carried
                    // over, and the wording follows the new kind of button
                    // unless the business wrote its own.
                    actionValue: "",
                    ...(isDefaultActionLabel(service.actionLabel)
                      ? { actionLabel: ACTION_LABEL_DEFAULTS[value] }
                      : {}),
                  })
                }
                options={MINI_WEBSITE_ACTION_TYPES.map((type) => ({
                  value: type,
                  label: ACTION_TYPE_LABELS[type],
                }))}
              />
            </div>

            {service.actionType !== "none" && (
              <div>
                <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                  {service.actionType === "link" ? "لینک" : "ژمارەی مۆبایل"}
                </MiniWebsiteFieldLabel>
                {service.actionType === "link" ? (
                  <input
                    required
                    value={service.actionValue}
                    onChange={(event) =>
                      patchAt(index, { actionValue: event.target.value })
                    }
                    maxLength={500}
                    placeholder="https://example.com"
                    aria-label={`لینکی خزمەتگوزاری ${index + 1}`}
                    className={inputClass}
                    dir="ltr"
                  />
                ) : (
                  // The same number field and country selector the social links
                  // and the branch phone use, so a number is entered one way
                  // across the whole product.
                  <StandardPlatformInput
                    platform={actionInputPlatform(service.actionType)}
                    value={service.actionValue}
                    countryCode={service.actionCountryCode}
                    onChange={(value) => patchAt(index, { actionValue: value })}
                    onCountryCodeChange={(code) =>
                      patchAt(index, { actionCountryCode: code })
                    }
                    inputClassName="h-11 text-xs sm:text-sm"
                    countryClassName="h-11"
                  />
                )}
              </div>
            )}
          </div>

          {/* One picture, optional — a card reads fine without it. Given the
              last row to itself and the wide frame, because a thumbnail the
              size of a text field shows nothing useful about the photo. */}
          <MediaUpload
            label="وێنە"
            wide
            value={service.image ? [service.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          {errors[`service.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`service.${index}`]}
            </p>
          )}
        </div>
      ))}

      {services.length < MINI_WEBSITE_MAX_SERVICES && (
        <button
          type="button"
          onClick={() => {
            // A new offer arrives with its button already worded, the way a
            // new social link arrives with its platform name filled in.
            const next = createMiniWebsiteService();
            setServices([
              ...services,
              { ...next, actionLabel: ACTION_LABEL_DEFAULTS[next.actionType] },
            ]);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {services.length ? "خزمەتگوزارییەکی تر" : "زیادکردنی خزمەتگوزاری"}
        </button>
      )}
    </div>
  );
}
