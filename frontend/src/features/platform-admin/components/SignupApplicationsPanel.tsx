"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardList, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api/request";
import Image from "next/image";
import { CheckboxField } from "@/components/shared/CheckboxField";
import { EmptyState } from "@/components/shared/EmptyState";

type Application = {
  id: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  phone: string;
  requestedSubdomain: string;
  logo?: string | null;
  favicon?: string | null;
  defaultAvatar?: string | null;
};
type Plan = { id: string; name: string; status: string; isDefault: boolean };

export function SignupApplicationsPanel({
  onApproved,
  reloadToken = 0,
}: {
  onApproved: () => void;
  reloadToken?: number;
}) {
  const [items, setItems] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState("");
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [phoneVerified, setPhoneVerified] = useState<Record<string, boolean>>(
    {},
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [applications, billing] = await Promise.all([
      apiRequest<Application[]>("/api/platform/signup/applications"),
      apiRequest<{ plans: Plan[] }>("/api/platform/billing"),
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
    item: Application,
    action: "request_changes" | "reject" | "approve",
  ) {
    const reason = action === "approve" ? undefined : reasons[item.id]?.trim();
    if (action !== "approve" && !reason) return;
    setBusy(item.id);
    try {
      await apiRequest(`/api/platform/signup/applications/${item.id}`, {
        method: "PATCH",
        json: {
          action,
          reason,
          subscriptionPlanId:
            action === "approve" ? selection[item.id] : undefined,
          phoneVerified:
            action === "approve" ? Boolean(phoneVerified[item.id]) : undefined,
        },
      });
      toast.success(
        action === "approve" ? "بزنس پەسەند و دروستکرا" : "داواکاری نوێکرایەوە",
      );
      await load();
      if (action === "approve") onApproved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "کردارەکە سەرکەوتوو نەبوو",
      );
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
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.025]"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex -space-x-2">
                    {[item.logo, item.defaultAvatar, item.favicon].map(
                      (source, index) =>
                        source ? (
                          <Image
                            key={source}
                            src={source}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg border-2 border-white bg-white object-contain dark:border-[#1c222b]"
                          />
                        ) : (
                          <span
                            key={index}
                            className="h-10 w-10 rounded-lg border-2 border-white bg-slate-100 dark:border-[#1c222b]"
                          />
                        ),
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white">
                      {item.businessName || item.ownerName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.ownerEmail} · {item.phone} ·{" "}
                      {item.requestedSubdomain}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-600">
                  {item.status}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs dark:border-white/10 dark:bg-[#161b22]"
                  value={selection[item.id] || ""}
                  onChange={(event) =>
                    setSelection({
                      ...selection,
                      [item.id]: event.target.value,
                    })
                  }
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 rounded-xl border border-slate-200 px-3 text-xs dark:border-white/10 dark:bg-[#161b22]"
                  placeholder="هۆکاری گۆڕانکاری یان ڕەتکردنەوە"
                  value={reasons[item.id] || ""}
                  onChange={(event) =>
                    setReasons({ ...reasons, [item.id]: event.target.value })
                  }
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <div className="mr-auto min-w-56">
                  <CheckboxField
                    compact
                    checked={Boolean(phoneVerified[item.id])}
                    onChange={(checked) =>
                      setPhoneVerified({
                        ...phoneVerified,
                        [item.id]: checked,
                      })
                    }
                    label="ژمارەی مۆبایل پشتڕاستکراوەتەوە"
                    description="پێش پەسەندکردن، دڵنیابە ژمارەکە هی داواکارەکەیە."
                  />
                </div>
                <button
                  disabled={busy === item.id || !reasons[item.id]?.trim()}
                  onClick={() => void review(item, "request_changes")}
                  className="h-10 rounded-xl border border-amber-300 px-3 text-xs font-bold text-amber-700 disabled:opacity-40"
                >
                  گۆڕانکاری
                </button>
                <button
                  disabled={busy === item.id || !reasons[item.id]?.trim()}
                  onClick={() => void review(item, "reject")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-300 text-red-600 disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  disabled={
                    busy === item.id ||
                    !selection[item.id] ||
                    !phoneVerified[item.id]
                  }
                  onClick={() => void review(item, "approve")}
                  className="sa-gradient flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                  پەسەندکردن
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
