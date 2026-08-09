"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { MotionSpinner } from "@/components/motion/MotionPrimitives";

const PRIMARY = "var(--multitree-accent)";
const PRIMARY_DARK = "var(--multitree-accent-text)";

interface PlanEntitlements {
  [key: string]: unknown;
}

interface Plan {
  code: string;
  name: string;
  description: string;
  currency: string;
  yearlyPriceMinor: number;
  trialDays: number;
  isDefault: boolean;
  templateCount: number;
  entitlements: PlanEntitlements;
}

const FALLBACK_PLANS: Plan[] = [
  {
    code: "basic", name: "Basic", description: "Essential tools to launch your branded link pages.",
    currency: "USD", yearlyPriceMinor: 15000, trialDays: 0,
    isDefault: true, templateCount: 7,
    entitlements: { "limit.linktrees": 5, "feature.profile_editing": false, "feature.branding_editing": false, "feature.tiktok": false, "feature.advanced_analytics": false, "feature.remove_branding": false, "feature.premium_templates": false },
  },
  {
    code: "pro", name: "Pro", description: "Advanced features for growing businesses.",
    currency: "USD", yearlyPriceMinor: 20000, trialDays: 7,
    isDefault: false, templateCount: 11,
    entitlements: { "limit.linktrees": 20, "feature.profile_editing": true, "feature.branding_editing": true, "feature.tiktok": true, "feature.advanced_analytics": false, "feature.remove_branding": false, "feature.premium_templates": false },
  },
  {
    code: "ultra", name: "Ultra", description: "Everything unlocked. Maximum power and flexibility.",
    currency: "USD", yearlyPriceMinor: 30000, trialDays: 14,
    isDefault: false, templateCount: 12,
    entitlements: { "limit.linktrees": 999, "feature.profile_editing": true, "feature.branding_editing": true, "feature.tiktok": true, "feature.advanced_analytics": true, "feature.remove_branding": true, "feature.premium_templates": true },
  },
];

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value / 100);
  } catch {
    return `$${(value / 100).toFixed(0)}`;
  }
}

export function PlansSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/plans", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.length) setPlans(json.data);
        else setPlans(FALLBACK_PLANS);
      })
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false));
  }, []);

  const planIcon = (code: string) => {
    if (code === "ultra") return Crown;
    if (code === "pro") return Zap;
    return Sparkles;
  };

  const planFeatures = (plan: Plan): string[] => {
    const e = plan.entitlements;
    const features: string[] = [];
    const linkLimit = e["limit.linktrees"];
    if (typeof linkLimit === "number") {
      features.push(linkLimit >= 999 ? "Unlimited link pages" : `Up to ${linkLimit} link pages`);
    }
    features.push(`${plan.templateCount} templates`);
    if (e["feature.tiktok"] === true) features.push("TikTok Pixel & Events API");
    if (e["feature.advanced_analytics"] === true) features.push("Advanced analytics & reporting");
    else features.push("Core analytics");
    if (e["feature.profile_editing"] === true) features.push("Business profile editing");
    if (e["feature.branding_editing"] === true) features.push("Custom branding (logo, favicon, colors)");
    if (e["feature.remove_branding"] === true) features.push("Remove MultiTree branding");
    if (e["feature.premium_templates"] === true) features.push("Premium templates");
    if (plan.trialDays > 0) features.push(`${plan.trialDays}-day free trial`);
    if (e["feature.page_defaults"] === true) features.push("Page defaults configuration");
    features.push("MultiTree subdomain");
    return features;
  };

  if (loading) {
    return (
      <section id="pricing" className="scroll-mt-16 bg-white dark:bg-[#0f172a] py-20 transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-16 flex max-w-2xl flex-col gap-4 text-center">
            <h2 className="text-3xl font-semibold tracking-[-.02em] text-[#111827] dark:text-white">Simple, Scalable Plans</h2>
            <p className="text-gray-600 dark:text-slate-400">A clear structure for every stage of your MultiTree network.</p>
          </div>
          <div className="flex justify-center py-12">
            <MotionSpinner>
              <span
                className="h-8 w-8 rounded-full border-2 border-gray-300"
                style={{ borderTopColor: PRIMARY }}
              />
            </MotionSpinner>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="scroll-mt-16 bg-white dark:bg-[#0f172a] py-20 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-16 flex max-w-2xl flex-col gap-4 text-center">
          <h2 className="text-3xl font-semibold tracking-[-.02em] text-[#111827] dark:text-white">Simple, Scalable Plans</h2>
          <p className="text-gray-600 dark:text-slate-400">A clear structure for every stage of your MultiTree network.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = planIcon(plan.code);
            const isPopular = plan.code === "pro";
            const features = planFeatures(plan);
            return (
              <article
                key={plan.code}
                className={`relative flex flex-col gap-8 rounded-[2rem] bg-white dark:bg-[#1e293b] p-10 transition hover:-translate-y-2 ${
                  isPopular
                    ? "border-2 shadow-xl lg:scale-105 dark:border-opacity-50"
                    : "border border-gray-200 dark:border-gray-800 shadow-sm"
                }`}
                style={isPopular ? { borderColor: PRIMARY } : undefined}
              >
                {isPopular && (
                  <span
                    className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest"
                    style={{ backgroundColor: PRIMARY, color: "var(--multitree-accent-ink)" }}
                  >
                    Most popular
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: plan.code === "ultra" ? "#f59e0b" : plan.code === "pro" ? "#8b5cf6" : PRIMARY_DARK }} />
                    <span
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color: isPopular ? PRIMARY_DARK : "#6b7280" }}
                    >
                      {plan.name}
                    </span>
                  </div>
                  <div className="mt-3 text-4xl font-bold text-[#111827] dark:text-white">
                    {formatMoney(plan.yearlyPriceMinor, plan.currency)}
                    <span className="text-sm font-normal text-gray-400 dark:text-slate-500">/yr</span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-gray-500 dark:text-slate-400">
                    {plan.description}
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                      <Check className="h-4 w-4 shrink-0" style={{ color: PRIMARY_DARK }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="#solutions"
                  className={`w-full rounded-xl py-4 text-center text-sm font-bold transition cursor-pointer ${
                    isPopular
                      ? ""
                      : "border dark:border-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  style={
                    isPopular
                      ? { backgroundColor: PRIMARY, color: "var(--multitree-accent-ink)" }
                      : { borderColor: PRIMARY, color: PRIMARY_DARK }
                  }
                >
                  {plan.trialDays > 0 ? `Start ${plan.trialDays}-day trial` : "Get started"}
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
