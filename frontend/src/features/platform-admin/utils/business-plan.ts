import type { PlatformBusiness as Business } from "@linktree/types";

export function getBusinessPlanLabel(business: Business): string {
  return business.planName?.trim() || business.plan?.trim() || "No plan";
}

export function getBusinessPlanBadgeClasses(plan?: string): string {
  const normalizedPlan = plan?.trim().toLowerCase() || "";

  if (normalizedPlan.includes("enterprise")) {
    return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/25 dark:bg-purple-400/10 dark:text-purple-300";
  }

  if (normalizedPlan.includes("premium") || normalizedPlan.includes("pro")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-300";
  }

  if (
    normalizedPlan.includes("free") ||
    normalizedPlan.includes("trial") ||
    normalizedPlan.includes("starter") ||
    normalizedPlan.includes("basic")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-300";
}
