"use client";

import { WalletCards } from "lucide-react";
import {
  MINI_WEBSITE_ACTION_TYPES,
  MINI_WEBSITE_MAX_PLANS,
  MINI_WEBSITE_MAX_PLAN_FEATURES,
  createMiniWebsitePlan,
  miniWebsitePlanFeatureRows,
  type MiniWebsiteActionType,
  type MiniWebsitePlan,
} from "@linktree/types";
import { CheckboxField } from "@/components/shared/CheckboxField";
import { CustomSelect } from "@/components/shared/CustomSelect";
import {
  CollectionEditor,
  DescriptionField,
  TextField,
} from "./MiniWebsiteCollectionEditor";
import {
  ACTION_TYPE_LABELS,
  parseLeadFieldOptions,
} from "./lead-form-options";
import type { MiniWebsiteDraft } from "./types";
import type { MiniWebsiteValidationErrors } from "./validation";

export function MiniWebsitePricingFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: MiniWebsiteDraft;
  onChange: (draft: MiniWebsiteDraft) => void;
  errors?: MiniWebsiteValidationErrors;
}) {
  const setItems = (plans: MiniWebsitePlan[]) => onChange({ ...draft, plans });
  // What every other tier lists. Shown as a reminder because a feature left out
  // of one plan is rendered on the page as a gap in that plan, not as silence.
  const allFeatures = miniWebsitePlanFeatureRows(draft.plans);

  return (
    <div className="space-y-4">
      {allFeatures.length > 1 && (
        <p className="rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500 dark:bg-white/5 dark:text-slate-400">
          هەر تایبەتمەندییەک لە یەک پلاندا بێت و لە پلانێکی تردا نەبێت، لەو
          پلانەدا وەک نەبوون (✕) پیشان دەدرێت. پێویست ناکات دووبارە بینووسیت.
        </p>
      )}
      <CollectionEditor
        items={draft.plans}
        max={MINI_WEBSITE_MAX_PLANS}
        singular="پلان"
        emptyText="یەکەم پلان زیاد بکە."
        icon={WalletCards}
        error={errors.plans}
        setItems={setItems}
        createItem={createMiniWebsitePlan}
      >
        {(plan, index, patch) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="ناوی پلان"
                required
                value={plan.name}
                onChange={(name) => patch({ name })}
                placeholder="سادە / باش / تەواو"
              />
              <TextField
                label="نرخ"
                required
                value={plan.price}
                onChange={(price) => patch({ price })}
                placeholder="١٢٠,٠٠٠ د.ع"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="نرخ بۆ چ ماوەیەک"
                value={plan.period}
                onChange={(period) => patch({ period })}
                placeholder="مانگانە"
              />
              <TextField
                label="دەقی دوگمە"
                value={plan.actionLabel}
                onChange={(actionLabel) => patch({ actionLabel })}
                placeholder="هەڵبژێرە"
              />
            </div>
            <DescriptionField
              label="لێدوانی کورت"
              value={plan.description}
              onChange={(description) => patch({ description })}
              placeholder="بۆ کێ گونجاوە؟"
              maxLength={600}
            />
            <DescriptionField
              label="تایبەتمەندییەکان — هەر دێڕێک یەکێک"
              required
              value={plan.features.join("\n")}
              onChange={(value) =>
                patch({
                  features: parseLeadFieldOptions(
                    value,
                    MINI_WEBSITE_MAX_PLAN_FEATURES,
                  ),
                })
              }
              placeholder={"پشتیوانی ٢٤/٧\nنوێکردنەوەی خۆڕایی\nڕاپۆرتی مانگانە"}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <CustomSelect<MiniWebsiteActionType>
                label="جۆری دوگمە"
                value={plan.actionType}
                onChange={(actionType) => patch({ actionType })}
                options={MINI_WEBSITE_ACTION_TYPES.map((actionType) => ({
                  value: actionType,
                  label: ACTION_TYPE_LABELS[actionType],
                }))}
                triggerClassName="h-11"
                labelClassName="!text-[11px] !font-black !normal-case !tracking-normal !text-slate-600 dark:!text-slate-300"
              />
              {plan.actionType !== "none" && (
                <TextField
                  label={plan.actionType === "link" ? "لینک" : "ژمارە"}
                  dir="ltr"
                  value={plan.actionValue}
                  onChange={(actionValue) => patch({ actionValue })}
                  placeholder={
                    plan.actionType === "link" ? "https://..." : "7500000000"
                  }
                />
              )}
            </div>
            {/* Set apart from the inputs above: this is a decision about the
                plan, not another thing to type into it. */}
            <div className="pt-2">
              <CheckboxField
                checked={plan.featured}
                onChange={(featured) =>
                  setItems(
                    draft.plans.map((current, currentIndex) => ({
                      ...current,
                      // Only one tier can be the recommendation, so choosing one
                      // clears the others rather than letting two compete.
                      featured: currentIndex === index ? featured : false,
                    })),
                  )
                }
                label="پلانی پێشنیارکراو"
                description="بە جیاکراوە پیشان دەدرێت لە ناوەڕاستی خشتەکە."
                compact
              />
            </div>
            {errors[`plan.${index}`] && (
              <p className="text-[11px] font-bold text-red-500">
                {errors[`plan.${index}`]}
              </p>
            )}
          </>
        )}
      </CollectionEditor>
    </div>
  );
}
