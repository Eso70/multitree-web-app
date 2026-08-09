import type { EffectiveAccessManifest } from "@linktree/types";
import { apiRequest, isApiRequestError } from "@/lib/api/request";

export type BusinessProfile = Record<string, unknown>;

export async function getBusinessDashboardState(): Promise<{
  effectiveAccess: EffectiveAccessManifest;
  profile: BusinessProfile | null;
}> {
  const [effectiveAccess, profile] = await Promise.all([
    apiRequest<EffectiveAccessManifest>("/api/auth/effective-access"),
    // `business:profile:read` is a plan-gated capability, so this call answers
    // 403 on the plans that do not include it. That is a feature the business
    // lacks, not a session it may not use: every plan is granted
    // `business:dashboard:view`. Letting the rejection through would make the
    // caller treat the whole dashboard as forbidden and replace it with a 403
    // page, which is exactly what used to happen on Basic and Pro.
    //
    // Only the profile is optional. `effective-access` carries no capability
    // requirement, so a 403 from it is a genuine access-rule block and must
    // still propagate.
    apiRequest<{ user?: BusinessProfile }>("/api/auth/profile").catch(
      (error: unknown) => {
        if (isApiRequestError(error, 403)) return { user: undefined };
        throw error;
      },
    ),
  ]);
  return { effectiveAccess, profile: profile.user ?? null };
}

export type AnalyticsPageType = "linktree" | "mini_website";

export function getBusinessAnalyticsSummary(
  pageType?: AnalyticsPageType,
): Promise<Record<string, unknown>> {
  const query = pageType ? `?pageType=${encodeURIComponent(pageType)}` : "";
  return apiRequest<Record<string, unknown>>(
    `/api/analytics/v2/summary${query}`,
  );
}

export async function logoutBusiness(): Promise<void> {
  await apiRequest("/api/auth/logout", { method: "POST" });
}
