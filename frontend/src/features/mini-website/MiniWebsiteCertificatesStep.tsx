"use client";

import { Award, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  MINI_WEBSITE_MAX_CERTIFICATES,
  createMiniWebsiteCertificate,
  type MiniWebsiteCertificate,
} from "@linktree/types";
import { IconActionButton } from "@/components/shared/IconActionButton";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { MediaUpload } from "./MiniWebsiteContentStep";
import { MiniWebsiteFieldLabel } from "./MiniWebsiteFieldLabel";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

const inputClass = modalInputClass(false, "h-11 py-0");
const textareaClass = modalInputClass(false, "min-h-24 py-3");

export function MiniWebsiteCertificateFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const certificates = draft.certificates;
  const setCertificates = (next: MiniWebsiteCertificate[]) =>
    onChange({ ...draft, certificates: next });
  const patchAt = (index: number, patch: Partial<MiniWebsiteCertificate>) =>
    setCertificates(
      certificates.map((certificate, certificateIndex) =>
        certificateIndex === index ? { ...certificate, ...patch } : certificate,
      ),
    );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= certificates.length) return;
    const next = [...certificates];
    [next[index], next[target]] = [next[target], next[index]];
    setCertificates(next);
  };

  return (
    <div className="space-y-4">
      {errors.certificates && (
        <p className="text-[11px] font-bold text-red-500">
          {errors.certificates}
        </p>
      )}

      {certificates.map((certificate, index) => (
        <div
          key={certificate.id}
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
              value={certificate.title}
              onChange={(event) =>
                patchAt(index, { title: event.target.value })
              }
              maxLength={240}
              placeholder="ناوی بڕوانامە یان خەڵات"
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
                disabled={index === certificates.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </IconActionButton>
              <IconActionButton
                label="سڕینەوە"
                tone="danger"
                onClick={() =>
                  setCertificates(
                    certificates.filter(
                      (_, certificateIndex) => certificateIndex !== index,
                    ),
                  )
                }
              >
                <Trash2 className="h-4 w-4" />
              </IconActionButton>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                دامەزراوە
              </span>
              <input
                required
                value={certificate.issuer}
                onChange={(event) =>
                  patchAt(index, { issuer: event.target.value })
                }
                maxLength={160}
                placeholder="ناوی دامەزراوە"
                className={inputClass}
                dir="auto"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
                ساڵ
              </span>
              <input
                value={certificate.year}
                onChange={(event) =>
                  patchAt(index, { year: event.target.value })
                }
                maxLength={40}
                placeholder="٢٠٢٦"
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
            value={certificate.description}
            onChange={(event) =>
              patchAt(index, { description: event.target.value })
            }
            maxLength={2000}
            placeholder="وردەکارییەکی کورت"
            className={`${textareaClass} w-full resize-y`}
            dir="auto"
          />
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-black text-slate-600 dark:text-slate-300">
              لینکی پشتڕاستکردن
            </span>
            <input
              value={certificate.verificationUrl}
              onChange={(event) =>
                patchAt(index, { verificationUrl: event.target.value })
              }
              maxLength={500}
              placeholder="https://..."
              className={inputClass}
              dir="ltr"
            />
          </label>

          <MediaUpload
            label="وێنە"
            wide
            value={certificate.image ? [certificate.image] : []}
            onChange={(value) => patchAt(index, { image: value[0] ?? "" })}
          />

          {errors[`certificate.${index}`] && (
            <p className="text-[10px] font-bold text-red-500">
              {errors[`certificate.${index}`]}
            </p>
          )}
        </div>
      ))}

      {certificates.length < MINI_WEBSITE_MAX_CERTIFICATES && (
        <button
          type="button"
          onClick={() =>
            setCertificates([...certificates, createMiniWebsiteCertificate()])
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-black text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          {certificates.length ? "بڕوانامەیەکی تر" : "زیادکردنی بڕوانامە"}
        </button>
      )}

      {!certificates.length && (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
          <Award className="h-4 w-4 shrink-0" />
          یەکەم بڕوانامە یان دەستکەوت زیاد بکە.
        </div>
      )}
    </div>
  );
}
