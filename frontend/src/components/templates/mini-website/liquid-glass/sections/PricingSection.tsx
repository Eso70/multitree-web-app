import { useMemo } from "react";
import { BadgeCheck, ChevronLeft, Sparkles, X } from "lucide-react";
import type { Star } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, toneWash } from "../liquid-glass-utils";
import { miniWebsitePlanFeatureRows } from "@linktree/types";
import type { MiniWebsitePlan } from "@/features/mini-website/types";
import { PLAN_TONES } from "./section-tokens";

/**
 * The pricing table.
 *
 * Only what each tier includes is stored. The feature rows are the union of
 * every tier's list, so a tier that never mentioned a feature shows it struck
 * through rather than silently omitting it — which is the whole point of
 * putting the tiers beside one another instead of in separate cards.
 */
export function PricingSection({
  plans,
  interactive,
  tone = SWISS_ACCENT,
  ...frame
}: {
  plans: MiniWebsitePlan[];
  interactive: boolean;
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  icon: typeof Star;
}) {
  const shown = plans.filter(
    (plan) => plan.name.trim() && plan.features.length,
  );
  const rows = useMemo(() => miniWebsitePlanFeatureRows(shown), [shown]);
  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((plan, planIndex) => {
          const planTone = PLAN_TONES[planIndex % PLAN_TONES.length];
          const included = new Set(plan.features);
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 ${
                plan.featured ? "border-transparent shadow-lg" : ""
              }`}
              style={{
                background: `linear-gradient(150deg, ${toneWash(
                  planTone,
                  14,
                )}, ${toneWash(planTone, 4)})`,
                borderColor: plan.featured
                  ? toneWash(planTone, 40)
                  : toneWash(planTone, 26),
                ...(plan.featured
                  ? { outline: `2px solid ${toneWash(planTone, 55)}` }
                  : {}),
              }}
            >
              {plan.featured && (
                <span
                  className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black text-white shadow-sm"
                  style={{ backgroundColor: toneWash(planTone, 78) }}
                >
                  <Sparkles className="h-3 w-3" />
                  پێشنیارکراو
                </span>
              )}

              <h3 className="text-sm font-black sm:text-base" dir="auto">
                {plan.name}
              </h3>
              <p className="mt-3 flex items-baseline gap-1.5" dir="auto">
                <span
                  className="text-2xl font-black leading-none sm:text-[1.75rem]"
                  style={{ color: planTone }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-[11px] opacity-55">
                    / {plan.period}
                  </span>
                )}
              </p>
              {plan.description && (
                <p className="mt-3 text-xs leading-6 opacity-65" dir="auto">
                  {plan.description}
                </p>
              )}

              <ul className="mt-5 flex-1 space-y-2.5">
                {rows.map((feature) => {
                  const has = included.has(feature);
                  return (
                    <li
                      key={feature}
                      className={`flex items-start gap-2.5 text-xs leading-5 ${has ? "opacity-80" : "opacity-35"}`}
                      dir="auto"
                    >
                      {has ? (
                        <BadgeCheck
                          className="mt-px h-4 w-4 shrink-0"
                          style={{ color: planTone }}
                        />
                      ) : (
                        <X className="mt-px h-4 w-4 shrink-0" />
                      )}
                      <span className={has ? "" : "line-through"}>
                        {feature}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {plan.url && (
                <a
                  href={interactive ? plan.url : undefined}
                  onClick={(event) => {
                    if (!interactive) event.preventDefault();
                  }}
                  target={
                    interactive && /^https?:/i.test(plan.url)
                      ? "_blank"
                      : undefined
                  }
                  rel="noreferrer"
                  data-mini-action={`mini:plan:${plan.id}`}
                  className={`mini-glass-action mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-xs font-black transition duration-200 hover:-translate-y-0.5 hover:opacity-95 ${plan.featured ? "text-white shadow-sm" : ""}`}
                  style={
                    plan.featured
                      ? { backgroundColor: toneWash(planTone, 85) }
                      : { background: toneWash(planTone, 12), color: planTone }
                  }
                  dir="auto"
                >
                  {plan.actionLabel || "هەڵبژێرە"}
                  <ChevronLeft className="h-4 w-4" />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </SectionFrame>
  );
}
