"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api/request";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  SignupApplicationCard,
  type SignupApplication,
  type SignupPlan,
} from "@/features/platform-admin/components/SignupApplicationCard";

export function SignupApplicationsPanel({
  onApproved,
  reloadToken = 0,
}: {
  onApproved: () => void;
  reloadToken?: number;
}) {
  const [items, setItems] = useState<SignupApplication[]>([]);
  const [plans, setPlans] = useState<SignupPlan[]>([]);
  const [busy, setBusy] = useState("");
  const [selection, setSelection] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [applications, billing] = await Promise.all([
      apiRequest<SignupApplication[]>("/api/platform/signup/applications"),
      apiRequest<{ plans: SignupPlan[] }>("/api/platform/billing"),
    ]);
    const activePlans = billing.plans.filter(
      (plan) => plan.status === "active",
    );
    setItems(applications);
    setPlans(activePlans);
    setSelection((current) =>
      Object.fromEntries(
        applications.map((item) => [
          item.id,
          current[item.id] ||
            activePlans.find((plan) => plan.isDefault)?.id ||
            activePlans[0]?.id ||
            "",
        ]),
      ),
    );
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load().catch(() => undefined);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [load, reloadToken]);

  async function review(
    item: SignupApplication,
    action: "request_changes" | "reject" | "approve",
    reason?: string,
  ): Promise<boolean> {
    const reviewReason = action === "approve" ? undefined : reason?.trim();
    if (action !== "approve" && !reviewReason) return false;
    setBusy(item.id);
    try {
      await apiRequest(`/api/platform/signup/applications/${item.id}`, {
        method: "PATCH",
        json: {
          action,
          reason: reviewReason,
          subscriptionPlanId:
            action === "approve" ? selection[item.id] : undefined,
        },
      });
      toast.success(
        action === "approve" ? "بزنس پەسەند و دروستکرا" : "داواکاری نوێکرایەوە",
      );
      await load();
      if (action === "approve") onApproved();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "کردارەکە سەرکەوتوو نەبوو",
      );
      return false;
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState
            compact
            icon={ClipboardList}
            title="هیچ داواکارییەکی چاوەڕوان نییە"
            description="داواکارییە نوێکان لێرە دەردەکەون و دەتوانیت پشکنین و پەسەندیان بکەیت."
          />
        ) : (
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2" dir="ltr">
            {items.map((item, index) => (
              <SignupApplicationCard
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                plans={plans}
                selectedPlanId={selection[item.id] || ""}
                busy={busy === item.id}
                onPlanChange={(planId) =>
                  setSelection((current) => ({
                    ...current,
                    [item.id]: planId,
                  }))
                }
                onReview={(action, reason) => review(item, action, reason)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
