"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import {
  MINI_WEBSITE_BOOKING_DURATION_MAX,
  MINI_WEBSITE_BOOKING_DURATION_MIN,
  MINI_WEBSITE_BOOKING_PROVIDERS,
  MINI_WEBSITE_MAX_BOOKINGS,
  createMiniWebsiteBooking,
  type MiniWebsiteBooking,
  type MiniWebsiteBookingProvider,
} from "@linktree/types";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import { StandardPlatformInput } from "@/features/link-editor/components/StandardPlatformInput";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import {
  BOOKING_ACTION_LABELS,
  BOOKING_INPUT_PLACEHOLDERS,
  BOOKING_PROVIDER_LABELS,
  detectBookingProvider,
  phoneFromWhatsAppUrl,
} from "./booking-action";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");
const defaultLabels = new Set(Object.values(BOOKING_ACTION_LABELS));

export function MiniWebsiteBookingFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const bookings = draft.bookings;
  const setBookings = (next: MiniWebsiteBooking[]) =>
    onChange({ ...draft, bookings: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteBooking>) =>
    setBookings(
      bookings.map((booking, bookingIndex) =>
        bookingIndex === index ? { ...booking, ...patch } : booking,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= bookings.length) return;
    const next = [...bookings];
    [next[index], next[target]] = [next[target], next[index]];
    setBookings(next);
  };

  const changeProvider = (
    index: number,
    provider: MiniWebsiteBookingProvider,
  ) => {
    const current = bookings[index];
    const changesInputKind =
      (current.provider === "whatsapp") !== (provider === "whatsapp");
    patchAt(index, {
      provider,
      // URL providers can share the same destination while the business tries
      // the dropdown. Crossing to or from a phone field clears it because the
      // two values are not interchangeable.
      actionValue: changesInputKind ? "" : current.actionValue,
      url: "",
      ...(current.actionLabel.trim() === "" ||
      defaultLabels.has(current.actionLabel)
        ? { actionLabel: BOOKING_ACTION_LABELS[provider] }
        : {}),
    });
  };

  const changeDestination = (index: number, value: string) => {
    const current = bookings[index];
    const detectedProvider = detectBookingProvider(value);
    if (!detectedProvider) {
      patchAt(index, { actionValue: value, url: "" });
      return;
    }

    const detectedPhone =
      detectedProvider === "whatsapp"
        ? phoneFromWhatsAppUrl(value, current.actionCountryCode)
        : null;
    // Do not turn a WhatsApp URL without a usable phone number into a blank
    // phone field. The user can keep typing until the URL is complete.
    if (detectedProvider === "whatsapp" && !detectedPhone) {
      patchAt(index, { actionValue: value, url: "" });
      return;
    }

    patchAt(index, {
      provider: detectedProvider,
      actionValue:
        detectedProvider === "whatsapp" ? detectedPhone!.value : value,
      actionCountryCode:
        detectedProvider === "whatsapp"
          ? detectedPhone!.countryCode
          : current.actionCountryCode,
      url: "",
      ...(current.actionLabel.trim() === "" ||
      defaultLabels.has(current.actionLabel)
        ? { actionLabel: BOOKING_ACTION_LABELS[detectedProvider] }
        : {}),
    });
  };

  return (
    <div className="space-y-4">
      {errors.bookings && (
        <p className="text-[11px] font-bold text-red-500">{errors.bookings}</p>
      )}

      {bookings.map((booking, index) => (
        <div
          key={booking.id}
          className="mini-website-editor-item space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-[11px] font-black text-slate-400">
              {index + 1}
            </span>
            <label className="min-w-0 flex-1">
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ناوی حجز
              </MiniWebsiteFieldLabel>
            <input
              required
              value={booking.title}
              onChange={(event) =>
                patchAt(index, { title: event.target.value })
              }
              maxLength={240}
              placeholder="بۆ نموونە: ڕاوێژکاری سەرەتایی"
              aria-label={`ناوی حجز ${index + 1}`}
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
                disabled={index === bookings.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوەی حجز"
                tone="danger"
                onClick={() =>
                  setBookings(
                    bookings.filter(
                      (_, bookingIndex) => bookingIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <label>
            <MiniWebsiteFieldLabel className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              وردەکاری
            </MiniWebsiteFieldLabel>
            <textarea
              value={booking.description}
              onChange={(event) =>
                patchAt(index, { description: event.target.value })
              }
              maxLength={2000}
              placeholder="وردەکارییەکی کورت دەربارەی ئەم کاتە"
              className={`${textareaClass} w-full resize-y`}
              dir="auto"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ماوە
              </span>
              <input
                required
                type="number"
                min={MINI_WEBSITE_BOOKING_DURATION_MIN}
                max={MINI_WEBSITE_BOOKING_DURATION_MAX}
                placeholder="30"
                value={booking.durationMinutes}
                onChange={(event) =>
                  patchAt(index, {
                    durationMinutes: Number(event.target.value),
                  })
                }
                className={inputClass}
                dir="ltr"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                نرخ
              </span>
              <input
                value={booking.price}
                onChange={(event) =>
                  patchAt(index, { price: event.target.value })
                }
                maxLength={80}
                placeholder="بێبەرامبەر یان ٢٥,٠٠٠ د.ع"
                className={inputClass}
                dir="auto"
              />
            </label>
            <div>
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                پلاتفۆرم
              </MiniWebsiteFieldLabel>
              <CustomSelect
                label="پلاتفۆرم"
                hideLabel
                triggerClassName="h-11 text-xs sm:text-sm"
                value={booking.provider}
                onChange={(provider) => changeProvider(index, provider)}
                options={MINI_WEBSITE_BOOKING_PROVIDERS.map((provider) => ({
                  value: provider,
                  label: BOOKING_PROVIDER_LABELS[provider],
                }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <MiniWebsiteFieldLabel required className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                {booking.provider === "whatsapp"
                  ? "ژمارەی واتساپ"
                  : "لینک"}
              </MiniWebsiteFieldLabel>
              {booking.provider === "whatsapp" ? (
                <StandardPlatformInput
                  platform="whatsapp"
                  value={booking.actionValue}
                  countryCode={booking.actionCountryCode}
                  onChange={(value) =>
                    patchAt(index, { actionValue: value, url: "" })
                  }
                  onCountryCodeChange={(code) =>
                    patchAt(index, {
                      actionCountryCode: code,
                      url: "",
                    })
                  }
                  inputClassName="h-11 text-xs sm:text-sm"
                  countryClassName="h-11"
                />
              ) : (
                <input
                  required
                  value={booking.actionValue}
                  onChange={(event) =>
                    changeDestination(index, event.target.value)
                  }
                  maxLength={500}
                  placeholder={BOOKING_INPUT_PLACEHOLDERS[booking.provider]}
                  className={inputClass}
                  dir="ltr"
                />
              )}
              <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
                {booking.provider === "whatsapp"
                  ? "ژمارەکە لەگەڵ کۆدی وڵات خۆکارانە دەبێتە لینکی واتساپ."
                  : `لینکەکە خۆکارانە دەناسێتەوە و پلاتفۆرمەکە دەگۆڕێت بۆ ${BOOKING_PROVIDER_LABELS[booking.provider]}.`}
              </p>
            </div>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دەقی دوگمە
              </span>
              <input
                value={booking.actionLabel}
                onChange={(event) =>
                  patchAt(index, { actionLabel: event.target.value })
                }
                maxLength={120}
                placeholder={BOOKING_ACTION_LABELS[booking.provider]}
                className={inputClass}
                dir="auto"
              />
            </label>
          </div>

          {errors[`booking.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`booking.${index}`]}
            </p>
          )}
        </div>
      ))}

      {bookings.length < MINI_WEBSITE_MAX_BOOKINGS && (
        <button
          type="button"
          onClick={() => {
            const booking = createMiniWebsiteBooking();
            setBookings([
              ...bookings,
              {
                ...booking,
                actionLabel: BOOKING_ACTION_LABELS[booking.provider],
              },
            ]);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {bookings.length ? "کاتێکی تری حجز" : "زیادکردنی کاتی حجز"}
        </button>
      )}

      {!bookings.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <CalendarDays className="h-4 w-4 shrink-0" />
          کاتێک زیاد بکە و لینکی پلاتفۆرمی حجزکردنەکەت بنووسە.
        </div>
      )}
    </div>
  );
}
