"use client";

import { useState } from "react";
import { EditorField } from "@/components/shared/EditorField";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { NumberInput } from "@/components/shared/NumberInput";
import { CustomSelect } from "@/components/shared/CustomSelect";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { useTemplateAccess } from "@/hooks/useTemplateAccess";
import { TEMPLATE_OPTIONS } from "@/lib/templates/config";
import type { CreateClientAccessDemoInput } from "../mock-store";

const initialForm: CreateClientAccessDemoInput = {
  campaignLabel: "",
  templateName: TEMPLATE_OPTIONS[0].name,
  creationAccessDays: 3,
  resultAccessDays: 14,
  maxLinks: 8,
  requirePin: true,
  allowImageUploads: true,
  allowDraftSaving: true,
};

export function CreateClientInvitationDemoModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateClientAccessDemoInput) => void;
}) {
  const { isLoading: isTemplateAccessLoading, isTemplateAllowed } =
    useTemplateAccess();
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const accessibleTemplates = TEMPLATE_OPTIONS.filter((template) =>
    isTemplateAllowed(template.id),
  );
  const selectedTemplateName =
    accessibleTemplates.find((template) => template.name === form.templateName)
      ?.name ??
    accessibleTemplates[0]?.name ??
    "";
  const campaignError =
    submitted && form.campaignLabel.trim().length < 2
      ? "ناوی کڕیار یان کەمپین بە لانیکەم دوو پیت بنووسە."
      : undefined;
  const templateError =
    !isTemplateAccessLoading && accessibleTemplates.length === 0
      ? "هیچ قاڵبێک لە پلانی ئێستای بازرگانی بەردەست نییە."
      : undefined;

  const close = () => {
    setForm(initialForm);
    setSubmitted(false);
    onClose();
  };

  return (
    <ManagementModal
      isOpen={isOpen}
      onClose={close}
      title="بانگهێشتکردنی کڕیار"
      description="تەنها نموونەی ڕووکارە — ئەم بانگهێشتنامەیە لەم وێبگەڕەدا دەمێنێتەوە."
      createBusinessStyle
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            پاشگەزبوونەوە
          </button>
          <button
            type="button"
            disabled={
              isTemplateAccessLoading || accessibleTemplates.length === 0
            }
            onClick={() => {
              setSubmitted(true);
              if (
                form.campaignLabel.trim().length < 2 ||
                !selectedTemplateName
              ) {
                return;
              }
              onCreate({
                ...form,
                campaignLabel: form.campaignLabel.trim(),
                templateName: selectedTemplateName,
                allowedTemplateNames: accessibleTemplates.map(
                  (template) => template.name,
                ),
                allowedTemplateKeys: accessibleTemplates.map(
                  (template) => template.id,
                ),
              });
              close();
            }}
            className="h-11 rounded-xl border border-transparent px-5 text-sm font-bold text-[var(--theme-ink)] transition [background:var(--theme-css)] hover:brightness-95 disabled:cursor-wait disabled:opacity-50"
          >
            دروستکردنی بانگهێشتنامەی تاقیکردنەوە
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          ئەم شاشەیە تەنها پرۆسەی پێشنیارکراو پیشان دەدات. هیچ تۆکنی پارێزراو،
          دانیشتنی سێرڤەر، بارکردنی ڕاستەقینە یان لینکترییەکی خاوەندارێتی
          بازرگانی دروست ناکات.
        </div>

        <EditorField
          label="ناوی کڕیار یان کەمپین"
          required
          error={campaignError}
          hint="تەنها بازرگانی دەیبینێت"
        >
          <input
            value={form.campaignLabel}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                campaignLabel: event.target.value,
              }))
            }
            className={modalInputClass(Boolean(campaignError))}
            placeholder="نموونە: کەمپینی تیکتۆکی ئاب"
          />
        </EditorField>

        <div className="grid gap-4 sm:grid-cols-2">
          <CustomSelect
            label="بەسەرچوونی دەستگەیشتنی دروستکردن"
            value={String(form.creationAccessDays)}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                creationAccessDays: Number(value),
              }))
            }
            options={[1, 3, 7].map((days) => ({
              value: String(days),
              label: `${days.toLocaleString("ckb-IQ")} ڕۆژ`,
            }))}
            triggerClassName="h-11"
            labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
          />
          <CustomSelect
            label="ماوەی دەستگەیشتن بە ئەنجامەکان"
            value={String(form.resultAccessDays)}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                resultAccessDays: Number(value),
              }))
            }
            options={[1, 3, 7, 14, 30].map((days) => ({
              value: String(days),
              label: `${days.toLocaleString("ckb-IQ")} ڕۆژ`,
            }))}
            triggerClassName="h-11"
            labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
          />
          <EditorField
            label="قاڵبە ڕێگەپێدراوەکان"
            hint="هەموو قاڵبەکانی بەردەستی ئەم بازرگانییە"
            error={templateError}
          >
            <div
              className={`${modalInputClass(Boolean(templateError))} min-h-11`}
              aria-live="polite"
            >
              {isTemplateAccessLoading ? (
                <span className="text-slate-400">قاڵبەکان بار دەکرێن...</span>
              ) : accessibleTemplates.length === 0 ? (
                <span className="text-slate-400">هیچ قاڵبێک بەردەست نییە</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accessibleTemplates.map((template) => (
                    <span
                      key={template.id}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300"
                    >
                      {template.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </EditorField>
          <EditorField
            label="زۆرترین ژمارەی لینک"
            hint="١–٢٠ بۆ ئەم تاقیکردنەوەیە"
          >
            <NumberInput
              value={form.maxLinks}
              onValueChange={(maxLinks) =>
                setForm((current) => ({
                  ...current,
                  maxLinks: Math.min(20, maxLinks),
                }))
              }
              min={1}
              clearOnFocus
              className={modalInputClass()}
            />
          </EditorField>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <legend className="px-2 text-xs font-black text-slate-600 dark:text-slate-300">
            دەسەڵاتەکانی کڕیار
          </legend>
          {[
            ["requirePin", "پێویستی بە پینی جیاواز هەبێت"],
            ["allowImageUploads", "ڕێگە بە پێشبینینی وێنە بدە"],
            ["allowDraftSaving", "ڕێگە بە هەڵگرتنی ڕەشنووس لە وێبگەڕ بدە"],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200"
            >
              <input
                type="checkbox"
                checked={Boolean(
                  form[key as keyof CreateClientAccessDemoInput],
                )}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 accent-[var(--theme-primary)]"
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
    </ManagementModal>
  );
}
