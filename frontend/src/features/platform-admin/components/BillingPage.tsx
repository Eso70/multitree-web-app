"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Eye,
  Layers3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/CustomSelect";
import { DetailViewModal } from "@/components/shared/DetailViewModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchModal } from "@/components/shared/SearchModal";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { TablePagination } from "@/components/shared/TablePagination";
import { useModalKeyboard } from "@/hooks/useModalKeyboard";
import { StatCard } from "@/components/shared/StatCard";
import { SkeletonStatCards } from "@/components/shared/Skeleton";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { modalInputClass } from "@/features/link-editor/modal-input-styles";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

type Tab = "plans" | "businesses";
type PlanStatus = "active" | "inactive" | "archived";
type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "grace_period"
  | "paused"
  | "canceled"
  | "expired"
  | "incomplete";
type PlanSort = "displayOrder" | "nameAsc" | "newest" | "subscribers";
type BusinessSort = "nameAsc" | "recentlyUpdated" | "planName";

interface PermissionProfile {
  id: string;
  code: string;
  name: string;
  permissionCount: number;
}
interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  permissionProfileId: string;
  permissionProfileName: string;
  status: PlanStatus;
  currency: string;
  yearlyPriceMinor: number;
  trialDays: number;
  displayOrder: number;
  isDefault: boolean;
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

interface BusinessOption {
  id: string;
  name: string;
  username: string;
  status: string;
}

interface BusinessSubscription {
  id: string;
  businessId: string;
  businessName: string;
  username: string;
  businessStatus: string;
  planId: string;
  planName: string;
  permissionProfileId: string;
  permissionProfileName: string;
  status: SubscriptionStatus;
  startsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  updatedAt: string;
}

interface BillingOverview {
  plans: SubscriptionPlan[];
  permissionProfiles: PermissionProfile[];
  subscriptions: BusinessSubscription[];
  businesses: BusinessOption[];
  summary: {
    activePlans: number;
    activeSubscriptions: number;
    attentionRequired: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface BusinessRow extends BusinessOption {
  subscription: BusinessSubscription | null;
}

const tabs = [
  { id: "plans" as const, label: "پلانەکان", icon: Layers3 },
  { id: "businesses" as const, label: "بزنسەکان", icon: Building2 },
];

const planStatusOptions: Array<{ value: PlanStatus; label: string }> = [
  { value: "active", label: "چالاک" },
  { value: "inactive", label: "ناچالاک" },
  { value: "archived", label: "ئەرشیفکراو" },
];

const subscriptionStatusOptions: Array<{
  value: SubscriptionStatus;
  label: string;
}> = [
  { value: "active", label: "چالاک" },
  { value: "trialing", label: "تاقیکردنەوە" },
  { value: "grace_period", label: "ماوەی ڕێگەپێدان" },
  { value: "past_due", label: "پارەدان دواکەوتووە" },
  { value: "paused", label: "ڕاگیراو" },
  { value: "incomplete", label: "ناتەواو" },
  { value: "canceled", label: "هەڵوەشێنراوەتەوە" },
  { value: "expired", label: "بەسەرچووە" },
];

const planSortOptions: CustomSelectOption<PlanSort>[] = [
  { value: "displayOrder", label: "ڕیزبەندی پلان" },
  { value: "nameAsc", label: "ناو: أ ب پ" },
  { value: "newest", label: "نوێترین یەکەم" },
  { value: "subscribers", label: "زۆرترین بەشداربوو" },
];

const businessSortOptions: CustomSelectOption<BusinessSort>[] = [
  { value: "nameAsc", label: "ناو: أ ب پ" },
  { value: "recentlyUpdated", label: "دوایین نوێکردنەوە" },
  { value: "planName", label: "ناوی پلان" },
];

function planStatusLabel(status: PlanStatus) {
  return (
    planStatusOptions.find((option) => option.value === status)?.label || status
  );
}

function subscriptionStatusLabel(status?: SubscriptionStatus) {
  if (!status) return "دیاری نەکراوە";
  return (
    subscriptionStatusOptions.find((option) => option.value === status)
      ?.label || status
  );
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${(value / 100).toFixed(2)} ${currency}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "دیاری نەکراوە";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "دیاری نەکراوە" : date.toLocaleString();
}

function StatusBadge({
  status,
  type,
}: {
  status: PlanStatus | SubscriptionStatus | "unassigned";
  type: "plan" | "subscription";
}) {
  const critical = ["past_due", "expired", "incomplete", "archived"].includes(
    status,
  );
  const warning = ["trialing", "grace_period", "paused", "inactive"].includes(
    status,
  );
  const label =
    status === "unassigned"
      ? "پلان دیاری نەکراوە"
      : type === "plan"
        ? planStatusLabel(status as PlanStatus)
        : subscriptionStatusLabel(status as SubscriptionStatus);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${
        status === "unassigned"
          ? "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5"
          : critical
            ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
            : warning
              ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
      }`}
    >
      {label}
    </span>
  );
}

export function BillingPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planModal, setPlanModal] = useState<SubscriptionPlan | "create" | null>(
    null,
  );
  const [viewPlan, setViewPlan] = useState<SubscriptionPlan | null>(null);
  const [deletePlan, setDeletePlan] = useState<SubscriptionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewBusiness, setViewBusiness] = useState<BusinessRow | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [planSearch, setPlanSearch] = useState("");
  const [planStatusFilter, setPlanStatusFilter] = useState("all");
  const [planSort, setPlanSort] = useState<PlanSort>("displayOrder");
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessPlanFilter, setBusinessPlanFilter] = useState("all");
  const [businessStatusFilter, setBusinessStatusFilter] = useState("all");
  const [businessSort, setBusinessSort] =
    useState<BusinessSort>("nameAsc");
  const [businessPage, setBusinessPage] = useState(1);
  const deferredPlanSearch = useDeferredValue(
    planSearch.trim().toLocaleLowerCase(),
  );
  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(businessPage),
        limit: "10",
      });
      if (businessSearch.trim()) params.set("search", businessSearch.trim());
      const unassigned =
        businessPlanFilter === "unassigned" ||
        businessStatusFilter === "unassigned";
      if (unassigned) params.set("status", "unassigned");
      else if (businessStatusFilter !== "all") {
        params.set("status", businessStatusFilter);
      }
      if (
        businessPlanFilter !== "all" &&
        businessPlanFilter !== "unassigned"
      ) {
        params.set("planId", businessPlanFilter);
      }
      const response = await fetch(`/api/platform/billing?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.message || "بارکردنی بەشداربوونەکان سەرکەوتوو نەبوو",
        );
      }
      setOverview(result.data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "بارکردنی بەشداربوونەکان سەرکەوتوو نەبوو",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    businessPage,
    businessPlanFilter,
    businessSearch,
    businessStatusFilter,
  ]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load]);

  const businessRows = useMemo<BusinessRow[]>(() => {
    const byBusiness = new Map(
      (overview?.subscriptions || []).map((subscription) => [
        subscription.businessId,
        subscription,
      ]),
    );
    return (overview?.businesses || []).map((business) => ({
      ...business,
      subscription: byBusiness.get(business.id) || null,
    }));
  }, [overview]);

  const filteredPlans = useMemo(() => {
    const plans = (overview?.plans || []).filter((plan) => {
      const text =
        `${plan.name} ${plan.code} ${plan.description} ${plan.permissionProfileName}`.toLocaleLowerCase();
      return (
        (!deferredPlanSearch || text.includes(deferredPlanSearch)) &&
        (planStatusFilter === "all" || plan.status === planStatusFilter)
      );
    });

    return [...plans].sort((left, right) => {
      if (planSort === "nameAsc") return left.name.localeCompare(right.name);
      if (planSort === "newest") {
        return Date.parse(right.createdAt) - Date.parse(left.createdAt);
      }
      if (planSort === "subscribers") {
        return right.subscriberCount - left.subscriberCount;
      }
      return left.displayOrder - right.displayOrder;
    });
  }, [deferredPlanSearch, overview?.plans, planSort, planStatusFilter]);

  const filteredBusinesses = useMemo(() => {
    const businesses = businessRows;
    return [...businesses].sort((left, right) => {
      if (businessSort === "recentlyUpdated") {
        return (
          (Date.parse(right.subscription?.updatedAt || "") || 0) -
          (Date.parse(left.subscription?.updatedAt || "") || 0)
        );
      }
      if (businessSort === "planName") {
        return (left.subscription?.planName || "").localeCompare(
          right.subscription?.planName || "",
        );
      }
      return left.name.localeCompare(right.name);
    });
  }, [
    businessRows,
    businessSort,
  ]);

  const pageSize = overview?.pagination.limit || 10;
  const totalBusinessPages = overview?.pagination.totalPages || 1;
  const currentBusinessPage = overview?.pagination.page || businessPage;
  const pagedBusinesses = filteredBusinesses;

  const confirmDeletePlan = async () => {
    if (!deletePlan || isDeleting) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/platform/billing/subscription-plans/${deletePlan.id}`,
        { method: "DELETE", credentials: "include" },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          response.status === 409
            ? "پلانی بنەڕەتی یان پلانێک کە بزنسی پێوە بەستراوە ناتوانرێت بسڕدرێتەوە."
            : result.message || "سڕینەوەی پلان سەرکەوتوو نەبوو",
        );
        throw new Error(result.message || "Delete failed");
      }
      toast.success("پلانی بەشداربوون سڕایەوە");
      await load(true);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="min-h-[55vh] py-4">
        <SkeletonStatCards count={3} className="sm:grid-cols-3" />
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="ltr">
      <StatCardGrid columns={3}>
        <StatCard
          icon={Layers3}
          label="پلانە چالاکەکان"
          value={overview?.summary.activePlans || 0}
          color="green"
        />
        <StatCard
          icon={UsersRound}
          label="بەشداربوونی چالاک"
          value={overview?.summary.activeSubscriptions || 0}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="پێویستی بە سەرنجدان"
          value={overview?.summary.attentionRequired || 0}
          color="orange"
        />
      </StatCardGrid>

      <SegmentedTabs
        tabs={tabs}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setSearchOpen(false);
        }}
        accent="var(--multitree-accent)"
      />

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
        <PageHeader
          title={
            tab === "plans"
              ? "پلانەکانی بەشداربوون"
              : "بزنس و بەشداربوونەکان"
          }
          description={
            tab === "plans"
              ? "پلان، نرخ، ماوە و پڕۆفایلی مۆڵەتی هەر پلانێک بەڕێوە ببە."
              : "پلانی دیاریکراو، دۆخی بەشداربوون و ماوەی هەر بزنسێک بەڕێوە ببە."
          }
          icon={tab === "plans" ? Layers3 : Building2}
          action={
            <>
              <button
                type="button"
                onClick={() => void load(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
                aria-label="نوێکردنەوە"
              >
                <MotionSpinner active={refreshing}><RefreshCw
                  className="h-4 w-4"
                 /></MotionSpinner>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <SlidersHorizontal className="h-4 w-4" />
                گەڕان
              </button>
              {tab === "plans" && (
                <button
                  type="button"
                  onClick={() => setPlanModal("create")}
                  className="sa-gradient flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  پلانی نوێ
                </button>
              )}
            </>
          }
        />

        <div className="border-t border-slate-100 pt-5 dark:border-white/5">
          {tab === "plans" ? (
            <PlansTable
              plans={filteredPlans}
              onView={setViewPlan}
              onEdit={setPlanModal}
              onDelete={(plan) => {
                if (plan.isDefault) {
                  toast.error("پلانی بنەڕەتی ناتوانرێت بسڕدرێتەوە.");
                  return;
                }
                if (plan.subscriberCount > 0) {
                  toast.error(
                    "ئەم پلانە لەلایەن بزنسێکەوە بەکاردێت و ناتوانرێت بسڕدرێتەوە.",
                  );
                  return;
                }
                setDeletePlan(plan);
              }}
            />
          ) : (
            <>
              <BusinessesSubscriptionsTable
                businesses={pagedBusinesses}
                onView={setViewBusiness}
              />
              <TablePagination
                page={currentBusinessPage}
                pageSize={pageSize}
                totalItems={overview?.pagination.total || 0}
                totalPages={totalBusinessPages}
                onPageChange={setBusinessPage}
              />
            </>
          )}
        </div>
      </section>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        wide
        placeholder={
          tab === "plans"
            ? "گەڕان بە ناو، کۆد یان پڕۆفایلی مۆڵەت..."
            : "گەڕان بە ناو، ناوی بەکارهێنەر یان پلان..."
        }
        searchQuery={tab === "plans" ? planSearch : businessSearch}
        onSearchQueryChange={(value) => {
          if (tab === "plans") {
            setPlanSearch(value);
          } else {
            setBusinessSearch(value);
            setBusinessPage(1);
          }
        }}
      >
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              فلتەر و ڕیزبەندی
            </p>
            {(tab === "plans"
              ? !!planSearch || planStatusFilter !== "all" || planSort !== "displayOrder"
              : !!businessSearch ||
                businessPlanFilter !== "all" ||
                businessStatusFilter !== "all" ||
                businessSort !== "nameAsc") && (
              <button
                type="button"
                onClick={() => {
                  if (tab === "plans") {
                    setPlanSearch("");
                    setPlanStatusFilter("all");
                    setPlanSort("displayOrder");
                  } else {
                    setBusinessSearch("");
                    setBusinessPlanFilter("all");
                    setBusinessStatusFilter("all");
                    setBusinessSort("nameAsc");
                    setBusinessPage(1);
                  }
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-red-500 transition hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
                پاککردنەوە
              </button>
            )}
          </div>

          {tab === "plans" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <CustomSelect
                label="دۆخی پلان"
                value={planStatusFilter}
                options={[
                  { value: "all", label: "هەموو دۆخەکان" },
                  ...planStatusOptions,
                ]}
                onChange={setPlanStatusFilter}
              />
              <CustomSelect
                label="ڕیزبەندی"
                value={planSort}
                options={planSortOptions}
                onChange={setPlanSort}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <CustomSelect
                label="پلانی بەشداربوون"
                value={businessPlanFilter}
                options={[
                  { value: "all", label: "هەموو پلانەکان" },
                  { value: "unassigned", label: "بێ پلان" },
                  ...(overview?.plans || []).map((plan) => ({
                    value: plan.id,
                    label: plan.name,
                  })),
                ]}
                onChange={(value) => {
                  setBusinessPlanFilter(value);
                  setBusinessPage(1);
                }}
              />
              <CustomSelect
                label="دۆخی بەشداربوون"
                value={businessStatusFilter}
                options={[
                  { value: "all", label: "هەموو دۆخەکان" },
                  { value: "unassigned", label: "بێ بەشداربوون" },
                  ...subscriptionStatusOptions,
                ]}
                onChange={(value) => {
                  setBusinessStatusFilter(value);
                  setBusinessPage(1);
                }}
              />
              <CustomSelect
                label="ڕیزبەندی"
                value={businessSort}
                options={businessSortOptions}
                onChange={(value) => {
                  setBusinessSort(value);
                  setBusinessPage(1);
                }}
              />
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200/80 px-3 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            {tab === "plans" ? filteredPlans.length : filteredBusinesses.length} ئەنجام
          </span>
          <span className="text-[10px] text-slate-400">
            گەڕان و فلتەرەکان خۆکارانە جێبەجێ دەبن
          </span>
        </div>
      </SearchModal>

      {planModal && (
        <PlanFormModal
          plan={planModal === "create" ? undefined : planModal}
          plans={overview?.plans || []}
          permissionProfiles={overview?.permissionProfiles || []}
          onClose={() => setPlanModal(null)}
          onSaved={() => {
            setPlanModal(null);
            void load(true);
          }}
        />
      )}

      <PlanDetailModal plan={viewPlan} onClose={() => setViewPlan(null)} />
      <BusinessSubscriptionDetailModal
        business={viewBusiness}
        onClose={() => setViewBusiness(null)}
      />

      <ConfirmDeleteModal
        isOpen={!!deletePlan}
        onClose={() => {
          if (!isDeleting) setDeletePlan(null);
        }}
        onConfirm={confirmDeletePlan}
        isDeleting={isDeleting}
        title="سڕینەوەی پلانی بەشداربوون"
        message={
          <span>
            دڵنیایت لە سڕینەوەی پلانی <strong>{deletePlan?.name}</strong>؟ ئەم
            کردارە ناگەڕێندرێتەوە.
          </span>
        }
        zIndexClassName="z-[160]"
      />
    </div>
  );
}

function PlansTable({
  plans,
  onView,
  onEdit,
  onDelete,
}: {
  plans: SubscriptionPlan[];
  onView: (plan: SubscriptionPlan) => void;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
}) {
  if (!plans.length) {
    return (
      <EmptyState
        icon={Layers3}
        title="هیچ پلانێک نییە"
        description="یەکەم پلانی بەشداربوون دروست بکە."
      />
    );
  }
  return (
    <div className="overflow-x-auto custom-scrollbar lime-custom-scrollbar">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-slate-400 dark:border-white/5">
            {[
              "پلان",
              "پڕۆفایلی مۆڵەت",
              "نرخی ساڵانە",
              "تاقیکردنەوە",
              "بەشداربووان",
              "دۆخ",
              "کارەکان",
            ].map((header) => (
              <th key={header} className="px-3 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr
              key={plan.id}
              className="border-b border-slate-100 text-slate-600 transition hover:bg-slate-50/60 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-bold">{plan.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {plan.code}
                    </p>
                  </div>
                  {plan.isDefault && (
                    <span className="rounded-full bg-lime-50 px-2 py-1 text-[9px] font-bold text-lime-700 dark:bg-lime-500/10 dark:text-lime-300">
                      بنەڕەتی
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  <ShieldCheck className="h-3 w-3" />
                  {plan.permissionProfileName}
                </span>
              </td>
              <td className="px-3 py-3 font-semibold">
                {formatMoney(plan.yearlyPriceMinor, plan.currency)}
              </td>
              <td className="px-3 py-3">
                {plan.trialDays ? `${plan.trialDays} ڕۆژ` : "نییە"}
              </td>
              <td className="px-3 py-3">{plan.subscriberCount}</td>
              <td className="px-3 py-3">
                <StatusBadge status={plan.status} type="plan" />
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onView(plan)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    title="بینین"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(plan)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 transition hover:bg-violet-50 dark:hover:bg-violet-500/10"
                    title="دەستکاریکردن"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(plan)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                    title="سڕینەوە"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BusinessesSubscriptionsTable({
  businesses,
  onView,
}: {
  businesses: BusinessRow[];
  onView: (business: BusinessRow) => void;
}) {
  if (!businesses.length) {
    return (
      <EmptyState
        icon={Building2}
        title="هیچ بزنسێک نەدۆزرایەوە"
        description="فلتەرەکان بگۆڕە یان ناوێکی تر بگەڕێ."
      />
    );
  }
  return (
    <div className="overflow-x-auto custom-scrollbar lime-custom-scrollbar">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-slate-400 dark:border-white/5">
            {[
              "بزنس",
              "پلانی دیاریکراو",
              "پڕۆفایلی مۆڵەت",
              "کۆتایی ماوە",
              "دۆخ",
              "کارەکان",
            ].map((header) => (
              <th key={header} className="px-3 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {businesses.map((business) => (
            <tr
              key={business.id}
              className="border-b border-slate-100 text-slate-600 transition hover:bg-slate-50/60 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3">
                <p className="font-bold">{business.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  @{business.username}
                </p>
              </td>
              <td className="px-3 py-3 font-bold">
                {business.subscription?.planName || "دیاری نەکراوە"}
              </td>
              <td className="px-3 py-3">
                {business.subscription?.permissionProfileName || "—"}
              </td>
              <td className="px-3 py-3">
                {formatDate(business.subscription?.currentPeriodEnd)}
              </td>
              <td className="px-3 py-3">
                <StatusBadge
                  status={business.subscription?.status || "unassigned"}
                  type="subscription"
                />
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onView(business)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    title="بینین"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanDetailModal({
  plan,
  onClose,
}: {
  plan: SubscriptionPlan | null;
  onClose: () => void;
}) {
  return (
    <DetailViewModal
      isOpen={!!plan}
      onClose={onClose}
      title={plan?.name || ""}
      subtitle="وردەکاری پلانی بەشداربوون"
      icon={CreditCard}
      iconClassName="border-lime-200 bg-lime-50 text-lime-600 dark:border-lime-900/40 dark:bg-lime-950/20 dark:text-lime-300"
      fields={
        plan
          ? [
              {
                label: "دۆخ",
                value: <StatusBadge status={plan.status} type="plan" />,
              },
              {
                label: "پڕۆفایلی مۆڵەت",
                value: plan.permissionProfileName,
              },
              {
                label: "نرخی ساڵانە",
                value: formatMoney(plan.yearlyPriceMinor, plan.currency),
              },
              {
                label: "ماوەی تاقیکردنەوە",
                value: plan.trialDays ? `${plan.trialDays} ڕۆژ` : "نییە",
              },
              {
                label: "بەشداربووان",
                value: String(plan.subscriberCount),
              },
              {
                label: "پلانی بنەڕەتی",
                value: plan.isDefault ? "بەڵێ" : "نەخێر",
              },
              {
                label: "ڕیزبەندی",
                value: String(plan.displayOrder),
              },
              {
                label: "ڕوونکردنەوە",
                value: plan.description || "ڕوونکردنەوە نییە",
                fullWidth: true,
              },
            ]
          : []
      }
    />
  );
}

function BusinessSubscriptionDetailModal({
  business,
  onClose,
}: {
  business: BusinessRow | null;
  onClose: () => void;
}) {
  const subscription = business?.subscription;
  return (
    <DetailViewModal
      isOpen={!!business}
      onClose={onClose}
      title={business?.name || ""}
      subtitle={business ? `@${business.username}` : ""}
      icon={Building2}
      iconClassName="border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300"
      fields={
        business
          ? [
              {
                label: "پلانی دیاریکراو",
                value: subscription?.planName || "دیاری نەکراوە",
              },
              {
                label: "پڕۆفایلی مۆڵەت",
                value: subscription?.permissionProfileName || "دیاری نەکراوە",
              },
              {
                label: "دۆخی بەشداربوون",
                value: subscription ? (
                  <StatusBadge
                    status={subscription.status}
                    type="subscription"
                  />
                ) : (
                  "دیاری نەکراوە"
                ),
              },
              {
                label: "دەستپێکی ماوە",
                value: formatDate(subscription?.currentPeriodStart),
              },
              {
                label: "کۆتایی ماوە",
                value: formatDate(subscription?.currentPeriodEnd),
              },
              {
                label: "دواین نوێکردنەوە",
                value: formatDate(subscription?.updatedAt),
              },
            ]
          : []
      }
    />
  );
}

function ManagementModal({
  title,
  subtitle,
  saving,
  canSave,
  submitLabel,
  onClose,
  onSave,
  children,
}: {
  title: string;
  subtitle: string;
  saving: boolean;
  canSave: boolean;
  submitLabel: string;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  useModalKeyboard({
    isOpen: true,
    onEscape: onClose,
    enterEnabled: false,
  });

  useEffect(() => {
    document.body.classList.add("multitree-theme-portals");
    return () => document.body.classList.remove("multitree-theme-portals");
  }, []);

  return createPortal(
    <div
      className="modal-ltr fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4"
      dir="ltr"
      data-multitree-theme
      style={
        {
          "--theme-primary": "var(--multitree-accent)",
          "--theme-css": "var(--multitree-accent)",
        } as CSSProperties
      }
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-md   duration-300"
        onClick={onClose}
        aria-label="داخستن"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[95vh] overflow-hidden rounded-2xl border border-gray-100 bg-primary-95 shadow-2xl backdrop-blur-sm    duration-300 sm:max-h-[90vh]">
        <form
          className="flex h-full max-h-[95vh] flex-col sm:max-h-[90vh]"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="flex items-center justify-between border-b border-gray-100/50 bg-linear-to-r from-white to-slate-50/30 p-4 sm:p-5 md:p-6">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-700 sm:text-xl md:text-2xl">
                {title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-3 flex shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-linear-to-br from-slate-50 to-gray-50 p-2 text-slate-500 shadow-sm transition-all hover:from-slate-100 hover:to-gray-100 hover:text-slate-700 hover:shadow"
              aria-label="داخستن"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-linear-to-br from-white to-slate-50/20 p-4 sm:p-5 md:p-6 custom-scrollbar lime-custom-scrollbar">
            {children}
          </div>
          <ModalWizardActions
            variant="multitree"
            isFirstStep
            isFinalStep
            isSubmitting={saving}
            canContinue={canSave}
            submitLabel={submitLabel}
            onBack={() => undefined}
            onCancel={onClose}
            onNext={() => undefined}
            onSubmit={onSave}
          />
        </form>
      </div>
    </div>,
    document.body,
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-medium text-gray-700 sm:text-sm">
        {label} {required && <RequiredMark />}
      </span>
      {children}
    </label>
  );
}

const PLAN_DESCRIPTION_PRESETS: Record<string, string> = {
  basic:
    "Essential business access\n\nUp to 5 link pages\n7 templates\nCore analytics\nPage defaults configuration\nMultiTree subdomain",
  pro:
    "Advanced analytics management access\n\nUp to 20 link pages\n11 templates\nAdvanced analytics & reporting\nBusiness profile editing\nCustom branding (logo, favicon, colors)\nTikTok Pixel & Events API\n7-day free trial\nPage defaults configuration\nMultiTree subdomain",
  ultra:
    "Complete business access\n\nUnlimited link pages\n12 templates\nAdvanced analytics & reporting\nBusiness profile editing\nCustom branding (logo, favicon, colors)\nTikTok Pixel & Events API\nRemove MultiTree branding\nPremium templates\nPage defaults configuration\nMultiTree subdomain",
};

function getPlanDescriptionPreset(
  profileId: string,
  permissionProfiles: PermissionProfile[],
) {
  const code = permissionProfiles.find(
    (profile) => profile.id === profileId,
  )?.code;
  return code ? PLAN_DESCRIPTION_PRESETS[code] || "" : "";
}

function PlanFormModal({
  plan,
  plans,
  permissionProfiles,
  onClose,
  onSaved,
}: {
  plan?: SubscriptionPlan;
  plans: SubscriptionPlan[];
  permissionProfiles: PermissionProfile[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialPermissionProfileId =
    plan?.permissionProfileId || permissionProfiles[0]?.id || "";
  const [name, setName] = useState(plan?.name || "");
  const [permissionProfileId, setPermissionProfileId] = useState(
    initialPermissionProfileId,
  );
  const [description, setDescription] = useState(
    () =>
      getPlanDescriptionPreset(
        initialPermissionProfileId,
        permissionProfiles,
      ) ||
      plan?.description ||
      "",
  );
  const [currency, setCurrency] = useState(plan?.currency || "USD");
  const [yearlyPrice, setYearlyPrice] = useState(
    plan ? String(plan.yearlyPriceMinor / 100) : "0",
  );
  const [saving, setSaving] = useState(false);

  const duplicateName = plans.some(
    (item) =>
      item.id !== plan?.id &&
      item.name.trim().toLocaleLowerCase() ===
        name.trim().toLocaleLowerCase(),
  );
  const yearlyNumber = Number(yearlyPrice);
  const canSave =
    name.trim().length >= 2 &&
    !duplicateName &&
    !!permissionProfileId &&
    /^[A-Z]{3}$/.test(currency) &&
    Number.isFinite(yearlyNumber) &&
    yearlyNumber >= 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const response = await fetch(
        plan
          ? `/api/platform/billing/subscription-plans/${plan.id}`
          : "/api/platform/billing/subscription-plans",
        {
          method: plan ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            permissionProfileId,
            currency,
            yearlyPriceMinor: Math.round(yearlyNumber * 100),
          }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          response.status === 409
            ? "ئەم ناوە پێشتر بەکارهاتووە یان پلانی بنەڕەتی تر هەیە."
            : result.message || "پاشەکەوتکردنی پلان سەرکەوتوو نەبوو",
        );
        return;
      }
      toast.success(plan ? "پلان نوێکرایەوە" : "پلانی نوێ دروستکرا");
      onSaved();
    } catch {
      toast.error("پاشەکەوتکردنی پلان سەرکەوتوو نەبوو");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementModal
      title={plan ? "دەستکاریکردنی پلان" : "پلانی بەشداربوونی نوێ"}
      subtitle="زانیاری نرخ و پڕۆفایلی مۆڵەتی پلان دیاری بکە."
      saving={saving}
      canSave={canSave}
      submitLabel={plan ? "نوێکردنەوە" : "دروستکردن"}
      onClose={onClose}
      onSave={() => void save()}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="ناوی پلان" required>
            <input
              autoFocus
              className={modalInputClass(duplicateName)}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="بۆ نموونە: Business Pro"
            />
            {duplicateName && (
              <span className="block text-xs font-medium text-red-500">
                ئەم ناوە پێشتر بەکارهاتووە.
              </span>
            )}
          </FormField>
          <CustomSelect
            label="پڕۆفایلی مۆڵەت *"
            value={permissionProfileId}
            options={
              permissionProfiles.length
                ? permissionProfiles.map((profile) => ({
                    value: profile.id,
                    label: `${profile.name} · ${profile.permissionCount} مۆڵەت`,
                  }))
                : [{ value: "", label: "هیچ پڕۆفایلێک بەردەست نییە" }]
            }
            onChange={(profileId) => {
              setPermissionProfileId(profileId);
              const preset = getPlanDescriptionPreset(
                profileId,
                permissionProfiles,
              );
              if (preset) setDescription(preset);
            }}
            disabled={!permissionProfiles.length}
            labelClassName="text-xs font-medium text-gray-700 sm:text-sm normal-case tracking-normal"
            triggerClassName={`${modalInputClass()} flex items-center justify-between gap-2 font-medium h-auto`}
          />
        </div>

        <FormField label="ڕوونکردنەوە">
          <textarea
            className={`${modalInputClass()} min-h-24 resize-y`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="وردەکاری و ئامانجی ئەم پلانە بنووسە..."
            maxLength={500}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="نرخی ساڵانە" required>
            <input
              type="number"
              min="0"
              step="0.01"
              className={modalInputClass()}
              value={yearlyPrice}
              onChange={(event) => setYearlyPrice(event.target.value)}
            />
          </FormField>
          <FormField label="دراو" required>
            <CustomSelect
              label=""
              hideLabel
              value={currency}
              options={[
                { value: "USD", label: "USD · دۆلار" },
                { value: "IQD", label: "IQD · دینار" },
              ]}
              onChange={setCurrency}
              triggerClassName={`${modalInputClass()} flex items-center justify-between gap-2 font-medium h-auto`}
            />
          </FormField>
        </div>
      </div>
    </ManagementModal>
  );
}
