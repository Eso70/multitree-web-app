"use client";

import { ClipboardList, ShieldCheck } from "lucide-react";
import {
  MINI_WEBSITE_LEAD_FIELD_MAPPINGS,
  MINI_WEBSITE_LEAD_FIELD_TYPES,
  MINI_WEBSITE_LEAD_MAPPING_TYPES,
  MINI_WEBSITE_MAX_LEAD_FIELDS,
  MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS,
  createMiniWebsiteLeadField,
  type MiniWebsiteLeadField,
  type MiniWebsiteLeadFieldMapping,
  type MiniWebsiteLeadFieldType,
} from "@linktree/types";
import { CheckboxField } from "@/components/shared/CheckboxField";
import { CustomSelect } from "@/components/shared/CustomSelect";
import {
  CollectionEditor,
  DescriptionField,
  TextField,
} from "./MiniWebsiteCollectionEditor";
import {
  LEAD_FIELD_MAPPING_LABELS,
  LEAD_FIELD_TYPE_LABELS,
  parseLeadFieldOptions,
} from "./lead-form-options";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

/**
 * Which CRM slot a question of this type is allowed to fill.
 *
 * Offering "customer's email address" beside a dropdown would let a business
 * point the encrypted contact column at an arbitrary chosen option, so the list
 * is narrowed to what the mapping can honestly hold.
 */
function mappingsFor(
  type: MiniWebsiteLeadFieldType,
): readonly MiniWebsiteLeadFieldMapping[] {
  return MINI_WEBSITE_LEAD_FIELD_MAPPINGS.filter(
    (mapping) =>
      mapping === "none" ||
      MINI_WEBSITE_LEAD_MAPPING_TYPES[mapping].includes(type),
  );
}

export function MiniWebsiteLeadFormFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const { leadForm } = draft;
  const patchForm = (patch: Partial<MiniWebsiteDraft["leadForm"]>) =>
    onChange({ ...draft, leadForm: { ...leadForm, ...patch } });
  const setFields = (fields: MiniWebsiteLeadField[]) => patchForm({ fields });

  return (
    <div className="space-y-5">
      <TextField
        label="ناونیشانی فۆرم"
        value={leadForm.title}
        onChange={(title) => patchForm({ title })}
        placeholder="داواکاریەکەت بنێرە"
      />
      <DescriptionField
        label="لێدوانی کورت"
        value={leadForm.description}
        onChange={(description) => patchForm({ description })}
        placeholder="فۆرمەکە پڕ بکەرەوە و لە کەمتر لە ٢٤ کاتژمێردا وەڵامت دەدەینەوە."
        maxLength={600}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="دەقی دوگمە"
          value={leadForm.submitLabel}
          onChange={(submitLabel) => patchForm({ submitLabel })}
          placeholder="ناردن"
        />
        <TextField
          label="پەیامی سەرکەوتن"
          value={leadForm.successMessage}
          onChange={(successMessage) => patchForm({ successMessage })}
          placeholder="سوپاس، پەیوەندیت پێوە دەکەین."
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-white/10">
        <span className="flex items-center gap-2 text-[11px] font-black text-slate-600 dark:text-slate-300">
          <ShieldCheck className="h-4 w-4" />
          ڕەزامەندیی کڕیار
        </span>
        <p className="text-[10px] leading-4 text-slate-400 dark:text-slate-500">
          ئەم دەقە لەتەنیشت خانەی ڕەزامەندی دەردەکەوێت. بەبێ ڕەزامەندی، زانیاری
          کڕیار ناچێتە ناو بینەری تایبەتی TikTok Ads.
        </p>
        <DescriptionField
          label="دەقی ڕەزامەندی"
          value={leadForm.consentText}
          onChange={(consentText) =>
            patchForm({
              consentText,
              // The tick cannot be demanded once the sentence beside it is gone.
              consentRequired: consentText.trim()
                ? leadForm.consentRequired
                : false,
            })
          }
          placeholder="ڕازیم بە پەیوەندیکردنم دەربارەی ئەم داواکارییە."
          maxLength={600}
        />
        <CheckboxField
          checked={leadForm.consentRequired}
          disabled={!leadForm.consentText.trim()}
          onChange={(consentRequired) => patchForm({ consentRequired })}
          label="بەبێ ڕەزامەندی فۆرمەکە نانێردرێت"
          description="ئەمە بەشی «ڕێسا و متمانە» و سیاسەتی تایبەتمەندێتی داوا دەکات."
          compact
        />
        {errors.leadFormConsent && (
          <p className="text-[11px] font-bold text-red-500">
            {errors.leadFormConsent}
          </p>
        )}
      </div>

      <CollectionEditor
        items={leadForm.fields}
        max={MINI_WEBSITE_MAX_LEAD_FIELDS}
        singular="پرسیار"
        emptyText="یەکەم پرسیاری فۆرمەکە زیاد بکە."
        icon={ClipboardList}
        error={errors.leadForm}
        setItems={setFields}
        createItem={() => createMiniWebsiteLeadField("text")}
      >
        {(field, index, patch) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="پرسیار"
                required
                value={field.label}
                onChange={(label) => patch({ label })}
                placeholder="ناوی تەواو"
              />
              <CustomSelect<MiniWebsiteLeadFieldType>
                label="جۆری وەڵام"
                required
                showRequirement
                value={field.type}
                onChange={(type) =>
                  patch({
                    type,
                    // A mapping the new type cannot honestly hold is dropped
                    // rather than silently kept and rejected on save.
                    mapping: mappingsFor(type).includes(field.mapping)
                      ? field.mapping
                      : "none",
                    options: type === "select" ? field.options : [],
                  })
                }
                options={MINI_WEBSITE_LEAD_FIELD_TYPES.map((type) => ({
                  value: type,
                  label: LEAD_FIELD_TYPE_LABELS[type],
                }))}
                triggerClassName="h-11"
                labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomSelect<MiniWebsiteLeadFieldMapping>
                label="لە CRM ـدا وەک"
                value={field.mapping}
                onChange={(mapping) => patch({ mapping })}
                options={mappingsFor(field.type).map((mapping) => ({
                  value: mapping,
                  label: LEAD_FIELD_MAPPING_LABELS[mapping],
                }))}
                triggerClassName="h-11"
                labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
              />
              <TextField
                label="نموونەی وەڵام"
                value={field.placeholder}
                onChange={(placeholder) => patch({ placeholder })}
                placeholder="لە خانەکەدا بە ڕەنگی کاڵ دەردەکەوێت"
              />
            </div>
            {field.type === "select" && (
              <DescriptionField
                label="هەڵبژاردەکان — هەر دێڕێک یەک هەڵبژاردە"
                required
                value={field.options.join("\n")}
                onChange={(value) =>
                  patch({
                    options: parseLeadFieldOptions(
                      value,
                      MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS,
                    ),
                  })
                }
                placeholder={"هەولێر\nسلێمانی\nدهۆک"}
              />
            )}
            <TextField
              label="ڕێنمایی کورت"
              value={field.helpText}
              onChange={(helpText) => patch({ helpText })}
              placeholder="لەژێر خانەکەوە دەردەکەوێت"
            />
            {/* Set apart from the text inputs above it: this is a decision
                about the question, not another thing to type into it. */}
            <div className="pt-2">
              <CheckboxField
                checked={field.required}
                onChange={(required) => patch({ required })}
                label="وەڵامدانەوەی پێویستە"
                compact
              />
            </div>
            {errors[`leadField.${index}`] && (
              <p className="text-[11px] font-bold text-red-500">
                {errors[`leadField.${index}`]}
              </p>
            )}
          </>
        )}
      </CollectionEditor>
    </div>
  );
}
