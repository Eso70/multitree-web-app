"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MotionPulse } from "@/components/motion/MotionPrimitives";
import {
  Ban,
  Clock3,
  Eye,
  FileSearch,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/shared/CustomSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchModal } from "@/components/shared/SearchModal";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { TablePagination } from "@/components/shared/TablePagination";
import { StatCard } from "@/components/shared/StatCard";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { DetailViewModal } from "@/components/shared/DetailViewModal";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

type Effect = "deny" | "allow";
type Scope =
  | "multitree"
  | "platform_admin"
  | "business"
  | "business_admin"
  | "public_linktree"
  | "business_api";
type RuleStatus = "all" | "active" | "inactive" | "expired";
type Sort = "newest" | "oldest" | "mostMatched" | "recentlyMatched";
interface Rule {
  id: string;
  effect: Effect;
  scope: Scope;
  ipNetwork: string;
  reason: string;
  status: "active" | "inactive";
  expiresAt: string | null;
  matchCount: string;
  lastMatchedAt: string | null;
  createdAt: string;
  businessId: string | null;
  businessLabel: string | null;
  linktreeId: string | null;
  linktreeLabel: string | null;
  createdBy: string | null;
}
interface PageData {
  items: Rule[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  summary: {
    activeDeny: number;
    activeAllow: number;
    temporary: number;
    matches24h: number;
  };
}
interface BusinessOption {
  id: string;
  name: string;
}
interface LinktreeOption {
  id: string;
  name: string;
}

const tabs = [
  { id: "deny" as const, label: "IP ـە بلۆککراوەکان", icon: Ban },
  { id: "allow" as const, label: "IP ـە ڕێگەپێدراوەکان", icon: ShieldCheck },
];
const scopeOptions: CustomSelectOption<string>[] = [
  { value: "", label: "هەموو ئاستەکان" },
  { value: "multitree", label: "تەواوی MultiTree" },
  { value: "platform_admin", label: "سەرپەرشتیکردنی پلاتفۆرم" },
  { value: "business", label: "بزنسی دیاریکراو" },
  { value: "business_admin", label: "سەرپەرشتیاری بزنس" },
  { value: "public_linktree", label: "لاپەڕەی گشتی بزنس" },
  { value: "business_api", label: "API ی بزنس" },
];
const statusOptions: CustomSelectOption<RuleStatus>[] = [
  { value: "all", label: "هەموو دۆخەکان" },
  { value: "active", label: "چالاک" },
  { value: "inactive", label: "ناچالاک" },
  { value: "expired", label: "بەسەرچوو" },
];
const sortOptions: CustomSelectOption<Sort>[] = [
  { value: "newest", label: "نوێترین سەرەتا" },
  { value: "oldest", label: "کۆنترین سەرەتا" },
  { value: "mostMatched", label: "زۆرترین یەکگرتنەوە" },
  { value: "recentlyMatched", label: "دواین یەکگرتنەوە" },
];
const durationOptions: CustomSelectOption<string>[] = [
  { value: "permanent", label: "هەمیشەیی" },
  { value: "24h", label: "٢٤ کاتژمێر" },
  { value: "7d", label: "٧ ڕۆژ" },
  { value: "30d", label: "٣٠ ڕۆژ" },
];
const scopeLabel: Record<Scope, string> = {
  multitree: "تەواوی MultiTree",
  platform_admin: "سەرپەرشتیکردنی پلاتفۆرم",
  business: "بزنس",
  business_admin: "سەرپەرشتیاری بزنس",
  public_linktree: "لاپەڕەی گشتی",
  business_api: "API ی بزنس",
};

export function BlocklistsPage() {
  const [effect, setEffect] = useState<Effect>("deny");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [scope, setScope] = useState("");
  const [status, setStatus] = useState<RuleStatus>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const [ruleToView, setRuleToView] = useState<Rule | null>(null);
  const [ruleToEdit, setRuleToEdit] = useState<Rule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async (rule: Rule) => {
    const response = await fetch(
      `/api/platform/access-rules/${rule.id}/status`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: rule.status === "active" ? "inactive" : "active",
        }),
      },
    );
    if (response.ok) {
      toast.success("دۆخی ڕێساکە نوێکرایەوە");
      setReload((v) => v + 1);
    } else {
      toast.error("ناتوانرێت دۆخی ڕێساکە بگۆڕدرێت");
    }
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/platform/access-rules/${ruleToDelete.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (response.ok) {
        toast.success("ڕێساکە سڕایەوە");
        setReload((v) => v + 1);
        setRuleToDelete(null);
      } else {
        toast.error("ناتوانرێت ڕێساکە بسڕێتەوە");
      }
    } catch {
      toast.error("هەڵەیەک ڕوویدا لە کاتی سڕینەوەدا");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void reload;
    const load = async () => {
      try {
        const params = new URLSearchParams({
          effect,
          page: String(page),
          pageSize: "10",
          status,
          sort,
        });
        if (deferredSearch) params.set("search", deferredSearch);
        if (scope) params.set("scope", scope);
        const response = await fetch(`/api/platform/access-rules?${params}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const result = await response.json();
        if (!controller.signal.aborted) setData(result.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        toast.error("ناتوانرێت ڕێساکانی دەستگەیشتن باربکرێت");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [deferredSearch, effect, page, reload, scope, sort, status]);

  const summary = data?.summary || {
    activeDeny: 0,
    activeAllow: 0,
    temporary: 0,
    matches24h: 0,
  };
  const filterCount = [
    search,
    scope,
    status !== "all" ? status : "",
    sort !== "newest" ? sort : "",
  ].filter(Boolean).length;
  const clear = () => {
    setLoading(true);
    setSearch("");
    setScope("");
    setStatus("all");
    setSort("newest");
    setPage(1);
  };

  return (
    <div className="space-y-5" dir="ltr">
      <StatCardGrid className="mb-8">
        <StatCard
          loading={loading && !data}
          icon={Ban}
          label="IP ـە بلۆککراوە چالاکەکان"
          value={summary.activeDeny}
          color="orange"
        />
        <StatCard
          loading={loading && !data}
          icon={ShieldCheck}
          label="IP ـە ڕێگەپێدراوە چالاکەکان"
          value={summary.activeAllow}
          color="green"
        />
        <StatCard
          loading={loading && !data}
          icon={Clock3}
          label="ڕێسا کاتییەکان"
          value={summary.temporary}
          color="purple"
        />
        <StatCard
          loading={loading && !data}
          icon={FileSearch}
          label="یەکگرتنەوەکان لە ٢٤ کاتژمێردا"
          value={summary.matches24h}
          color="blue"
        />
      </StatCardGrid>
      <SegmentedTabs
        tabs={tabs}
        value={effect}
        onChange={(value) => {
          setLoading(true);
          setPage(1);
          setEffect(value);
        }}
        accent="var(--multitree-accent)"
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#161B22]">
        <PageHeader
          title={
            effect === "deny" ? "IP ـە بلۆککراوەکان" : "IP ـە ڕێگەپێدراوەکان"
          }
          description={
            effect === "deny"
              ? "لیستی تەواوی ئەو ناونیشانە IP یان مەودای CIDR یانەی کە ڕێگرییان لێکراوە لە دەستگەیشتن بە MultiTreeەکە یان لاپەڕە دیاریکراوەکان."
              : "لیستی ئەو ناونیشانە IP یانەی کە ڕێگەیان پێدراوە بە دەستگەیشتن بێ گوێدانە بلۆککەرەکانی تر."
          }
          action={
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="relative flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 cursor-pointer"
              >
                {filterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-lime-400 text-[9px] font-bold text-slate-900 ring-2 ring-white dark:ring-[#161B22]">
                    {filterCount}
                  </span>
                )}
                <SlidersHorizontal className="h-4 w-4" />
                فلتەرەکان
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="sa-gradient sa-gradient-hover flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {effect === "deny"
                  ? "زیادکردنی IP بلۆککراو"
                  : "زیادکردنی IP ڕێگەپێدراو"}
              </button>
            </>
          }
        />
        <div className="border-t border-slate-100 pt-5 dark:border-white/5">
          {loading && !data ? (
            <TableSkeleton />
          ) : data && data.items.length ? (
            <RulesTable
              rules={data.items}
              onView={setRuleToView}
              onEdit={setRuleToEdit}
              onToggle={handleToggle}
              onDelete={setRuleToDelete}
            />
          ) : (
            <EmptyState
              icon={effect === "deny" ? Ban : ShieldCheck}
              title={
                effect === "deny"
                  ? "هیچ IPیەکی بلۆککراو نییە"
                  : "هیچ IPیەکی ڕێگەپێدراو نییە"
              }
              description="یەکەم ڕێسای دەستگەیشتن زیاد بکە یان فلتەرەکانی گەڕانی ئێستا بگۆڕە."
            />
          )}
          {data && (
            <TablePagination
              page={data.page}
              pageSize={data.pageSize}
              totalItems={data.totalItems}
              totalPages={data.totalPages}
              onPageChange={(value) => {
                setLoading(true);
                setPage(value);
              }}
            />
          )}
        </div>
      </section>
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        wide
        placeholder="گەڕان بەپێی IP یان هۆکار..."
        searchQuery={search}
        onSearchQueryChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.03] mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              پاڵاوتن و ڕیزکردنی ورد
            </p>
            {filterCount > 0 && (
              <button
                onClick={clear}
                className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
              >
                پاککردنەوەی فلتەرەکان ({filterCount})
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <CustomSelect
              label="ئاستی ڕێسا"
              value={scope}
              options={scopeOptions}
              onChange={setScope}
            />
            <CustomSelect
              label="دۆخی ڕێسا"
              value={status}
              options={statusOptions}
              onChange={setStatus}
            />
            <CustomSelect
              label="ڕیزبەندکردن"
              value={sort}
              options={sortOptions}
              onChange={setSort}
            />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto pr-1">
          {!data?.items.length ? (
            <div className="py-8 text-center text-sm text-slate-400">
              هیچ ڕێسایەکی دەستگەیشتنی هاوتا نەدۆزرایەوە.
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {data.items.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => {
                    setRuleToView(rule);
                    setSearchOpen(false);
                  }}
                  className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${rule.effect === "deny" ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900/40 dark:bg-red-950/20" : "border-emerald-200 bg-emerald-50 text-emerald-500 dark:border-emerald-900/40 dark:bg-emerald-950/20"}`}
                    >
                      {rule.effect === "deny" ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {rule.ipNetwork}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {scopeLabel[rule.scope]} ·{" "}
                        {rule.linktreeLabel ||
                          rule.businessLabel ||
                          "هەموو ئامانجەکان"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 translate-x-1 pl-3 text-[11px] font-semibold opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100 sa-accent-text">
                    بینین ←
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </SearchModal>
      <CreateRuleModal
        open={createOpen || !!ruleToEdit}
        effect={effect}
        rule={ruleToEdit}
        onClose={() => {
          setCreateOpen(false);
          setRuleToEdit(null);
        }}
        onCreated={() => {
          setCreateOpen(false);
          setRuleToEdit(null);
          setReload((v) => v + 1);
        }}
      />
      <ConfirmDeleteModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        zIndexClassName="z-[150]"
        title="سڕینەوەی ڕێسای دەستگەیشتن"
        message={
          <span>
            ئایا دڵنیای لە سڕینەوەی ئەم ڕێسایە بۆ ناونیشانی IPی{" "}
            <strong>{ruleToDelete?.ipNetwork}</strong>؟ ئەم کارە ناگەڕێنرێتەوە.
          </span>
        }
      />
      <DetailViewModal
        isOpen={!!ruleToView}
        onClose={() => setRuleToView(null)}
        title={ruleToView ? ruleToView.ipNetwork : ""}
        subtitle={
          ruleToView
            ? ruleToView.effect === "deny"
              ? "دەستگەیشتنی بلۆککراو"
              : "دەستگەیشتنی ڕێگەپێدراو"
            : ""
        }
        icon={
          ruleToView
            ? ruleToView.effect === "deny"
              ? Ban
              : ShieldCheck
            : undefined
        }
        iconClassName={
          ruleToView
            ? ruleToView.effect === "deny"
              ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900/30 dark:bg-red-950/20"
              : "border-emerald-200 bg-emerald-50 text-emerald-500 dark:border-emerald-900/30 dark:bg-emerald-950/20"
            : undefined
        }
        fields={
          ruleToView
            ? [
                {
                  label: "دۆخ",
                  value: ruleToView.status === "active" ? "چالاک" : "ناچالاک",
                },
                { label: "ئاست", value: scopeLabel[ruleToView.scope] },
                {
                  label: "ئامانج",
                  value:
                    ruleToView.linktreeLabel ||
                    ruleToView.businessLabel ||
                    "هەموو",
                },
                {
                  label: "دروستکراوە لەلایەن",
                  value: ruleToView.createdBy || "سەرپەرشتیاری پلاتفۆرم",
                },
                {
                  label: "دروستکراوە",
                  value: new Date(ruleToView.createdAt).toLocaleString(),
                },
                {
                  label: "یەکگرتنەوەکان",
                  value: Number(ruleToView.matchCount).toLocaleString(),
                },
                {
                  label: "بەسەرچوون",
                  value: ruleToView.expiresAt
                    ? new Date(ruleToView.expiresAt).toLocaleString()
                    : "هەمیشەیی",
                },
                { label: "هۆکار", value: ruleToView.reason, fullWidth: true },
              ]
            : []
        }
        footer={
          <button
            onClick={() => setRuleToView(null)}
            className="w-full sm:w-auto px-4 sm:px-5 md:px-6 py-2 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 dark:from-white/5 dark:to-white/10 hover:from-slate-100 hover:to-gray-100 dark:hover:from-white/10 dark:hover:to-white/25 border border-slate-100 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-700 dark:hover:text-white text-xs sm:text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow cursor-pointer"
          >
            داخستن
          </button>
        }
      />
    </div>
  );
}

function RulesTable({
  rules,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  rules: Rule[];
  onView: (rule: Rule) => void;
  onEdit: (rule: Rule) => void;
  onToggle: (rule: Rule) => void;
  onDelete: (rule: Rule) => void;
}) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-slate-400 dark:border-white/5">
            {[
              "دۆخ",
              "IP / CIDR",
              "ئاست",
              "ئامانج",
              "بەسەرچوون",
              "یەکگرتنەوەکان",
              "دواین یەکگرتنەوە",
              "کارەکان",
            ].map((x) => (
              <th key={x} className="px-3 py-3 text-left font-semibold">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className="border-b border-slate-100 text-slate-600 transition hover:bg-slate-50/60 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3">
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-bold ${rule.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                >
                  {rule.status === "active" ? "چالاک" : "ناچالاک"}
                </span>
              </td>
              <td className="px-3 py-3 font-mono font-semibold">
                {rule.ipNetwork}
              </td>
              <td className="px-3 py-3">{scopeLabel[rule.scope]}</td>
              <td
                className="max-w-40 truncate px-3 py-3"
                title={rule.businessLabel || rule.linktreeLabel || "هەموو"}
              >
                {rule.linktreeLabel || rule.businessLabel || "هەموو"}
              </td>
              <td className="px-3 py-3">
                {rule.expiresAt
                  ? new Date(rule.expiresAt).toLocaleDateString()
                  : "هەمیشەیی"}
              </td>
              <td className="px-3 py-3">
                {Number(rule.matchCount).toLocaleString()}
              </td>
              <td className="px-3 py-3">
                {rule.lastMatchedAt
                  ? new Date(rule.lastMatchedAt).toLocaleString()
                  : "—"}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onView(rule)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                    title="بینینی ڕێسا"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(rule)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 transition hover:bg-violet-50 dark:hover:bg-violet-500/10"
                    title="دەستکاریکردنی"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(rule)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-500/10"
                    title={
                      rule.status === "active" ? "ناچالاککردن" : "چالاککردن"
                    }
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rule)}
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

function CreateRuleModal({
  open,
  effect,
  rule = null,
  onClose,
  onCreated,
}: {
  open: boolean;
  effect: Effect;
  rule?: Rule | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [ip, setIp] = useState("");
  const [scope, setScope] = useState<Scope>("multitree");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [businessId, setBusinessId] = useState("");
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [linktreeId, setLinktreeId] = useState("");
  const [linktrees, setLinktrees] = useState<LinktreeOption[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (rule) {
        setIp(rule.ipNetwork);
        setScope(rule.scope);
        setReason(rule.reason);
        setBusinessId(rule.businessId || "");
        setLinktreeId(rule.linktreeId || "");
        setDuration(rule.expiresAt ? "custom" : "permanent");
      } else {
        setIp("");
        setScope("multitree");
        setReason("");
        setBusinessId("");
        setLinktreeId("");
        setDuration("permanent");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, rule]);
  useEffect(() => {
    if (open)
      fetch("/api/platform/businesses/options?limit=100", {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((r) =>
          setBusinesses(
            (r.data || []).map((b: { id: string; name: string }) => ({
              id: b.id,
              name: b.name,
            })),
          ),
        )
        .catch(() => setBusinesses([]));
  }, [open]);
  useEffect(() => {
    const controller = new AbortController();
    if (scope !== "public_linktree" || !businessId) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setLinktreeId("");
          setLinktrees([]);
        }
      });
      return () => controller.abort();
    }
    fetch(`/api/platform/businesses/${businessId}/linktrees`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((r) => {
        if (!controller.signal.aborted) {
          setLinktreeId("");
          setLinktrees(
            (r.data || []).map((page: { id: string; name: string }) => ({
              id: page.id,
              name: page.name,
            })),
          );
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLinktreeId("");
          setLinktrees([]);
        }
      });
    return () => controller.abort();
  }, [businessId, scope]);
  const businessOptions = useMemo(
    () => [
      { value: "", label: "بزنسێک هەڵبژێرە" },
      ...businesses.map((b) => ({ value: b.id, label: b.name })),
    ],
    [businesses],
  );
  const linktreeOptions = useMemo(
    () => [
      {
        value: "",
        label: businessId
          ? "لاپەڕەیەکی گشتی هەڵبژێرە"
          : "سەرەتا بزنسێک هەڵبژێرە",
      },
      ...linktrees.map((page) => ({ value: page.id, label: page.name })),
    ],
    [businessId, linktrees],
  );
  const customDurationOptions = useMemo(() => {
    const opts = [...durationOptions];
    if (rule && rule.expiresAt) {
      opts.unshift({
        value: "custom",
        label: `مەیگۆڕە (${new Date(rule.expiresAt).toLocaleDateString()})`,
      });
    }
    return opts;
  }, [rule]);
  if (!open) return null;
  const requiresBusiness = [
    "business",
    "business_admin",
    "public_linktree",
    "business_api",
  ].includes(scope);
  const save = async () => {
    setSaving(true);
    try {
      const expiry =
        duration === "custom"
          ? rule?.expiresAt
          : duration === "permanent"
            ? undefined
            : new Date(
                Date.now() +
                  ({ "24h": 1, "7d": 7, "30d": 30 }[duration] || 1) * 86400000,
              ).toISOString();
      const response = await fetch(
        rule
          ? `/api/platform/access-rules/${rule.id}`
          : "/api/platform/access-rules",
        {
          method: rule ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            effect,
            scope,
            ipNetwork: ip,
            businessId: requiresBusiness ? businessId : undefined,
            linktreeId: scope === "public_linktree" ? linktreeId : undefined,
            reason,
            expiresAt: expiry,
          }),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          result?.message ||
            (rule
              ? "ناتوانرێت ڕێساکە نوێبکرێتەوە"
              : "ناتوانرێت ڕێساکە دروستبکرێت"),
        );
      toast.success(
        rule ? "ڕێسای دەستگەیشتن نوێکرایەوە" : "ڕێسای دەستگەیشتن دروستکرا",
      );
      setIp("");
      setReason("");
      setBusinessId("");
      setLinktreeId("");
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ناتوانرێت ڕێساکە دروستبکرێت",
      );
    } finally {
      setSaving(false);
    }
  };
  return createPortal(
    <div
      className="modal-ltr fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4"
      dir="ltr"
      data-multitree-theme
      style={
        {
          "--theme-primary": "var(--multitree-accent)",
          "--theme-css": "var(--multitree-accent)",
        } as React.CSSProperties
      }
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md   duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-[#1c222b] border border-slate-200 dark:border-white/10 shadow-2xl    duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh] selection:bg-lime-500/30 dark:selection:bg-lime-500/40">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 p-4 sm:p-5 md:p-6 bg-linear-to-r from-white to-slate-50/30 dark:from-[#1c222b] dark:to-slate-900/10"
          dir="ltr"
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-700 dark:text-gray-200 truncate font-kurdish">
              {rule
                ? "دەستکاریکردنی ڕێسای دەستگەیشتن"
                : effect === "deny"
                  ? "زیادکردنی IP بلۆککراو"
                  : "زیادکردنی IP ڕێگەپێدراو"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-kurdish mt-0.5 sm:mt-1">
              ڕێسای دەستگەیشتن
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-xl p-2 bg-linear-to-br from-slate-50 to-gray-50 dark:from-white/5 dark:to-white/10 hover:from-slate-100 hover:to-gray-100 dark:hover:from-white/10 dark:hover:to-white/25 text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-all duration-300 border border-slate-100 dark:border-white/10 shadow-sm hover:shadow cursor-pointer"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 bg-linear-to-br from-white to-slate-50/20 dark:from-[#1c222b] dark:to-slate-900/5 custom-scrollbar lime-custom-scrollbar space-y-4">
          <Field label="ناونیشانی IP یان CIDR">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="203.0.113.24 یان 203.0.113.0/24"
              className={inputClass}
              dir="ltr"
            />
          </Field>
          <CustomSelect
            label="ئاست"
            value={scope}
            options={
              scopeOptions.filter((x) => x.value) as CustomSelectOption<Scope>[]
            }
            onChange={setScope}
          />
          {requiresBusiness && (
            <CustomSelect
              label="بزنس"
              value={businessId}
              options={businessOptions}
              onChange={setBusinessId}
            />
          )}
          {scope === "public_linktree" && (
            <CustomSelect
              label="لاپەڕەی گشتی"
              value={linktreeId}
              options={linktreeOptions}
              onChange={setLinktreeId}
            />
          )}
          <CustomSelect
            label="ماوە"
            value={duration}
            options={customDurationOptions}
            onChange={setDuration}
          />
          <Field label="هۆکار">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={`${inputClass} h-auto resize-none py-3`}
              placeholder="بۆچی ئەم ڕێسای دەستگەیشتنە پێویستە؟"
              dir="ltr"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 dark:border-white/5 p-4 sm:p-5 md:p-6 bg-linear-to-r from-slate-50/30 to-white dark:from-slate-900/10 dark:to-[#1c222b] justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-xl bg-linear-to-br from-slate-50 to-gray-50 dark:from-white/5 dark:to-white/10 hover:from-slate-100 hover:to-gray-100 dark:hover:from-white/10 dark:hover:to-white/25 border border-slate-100 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:text-slate-700 dark:hover:text-white text-xs sm:text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow cursor-pointer"
          >
            پاشگەزبوونەوە
          </button>
          <button
            type="button"
            onClick={save}
            disabled={
              saving ||
              !ip.trim() ||
              !reason.trim() ||
              (requiresBusiness && !businessId) ||
              (scope === "public_linktree" && !linktreeId)
            }
            className="w-full sm:flex-1 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 rounded-xl sa-gradient hover:opacity-90 text-white text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sa-gradient-hover cursor-pointer"
          >
            {saving
              ? "پاشەکەوتکردن..."
              : rule
                ? "پاشەکەوتکردن"
                : "زیادکردنی ڕێسا"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-700 outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";
function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <MotionPulse
          key={i}
          className="h-12 rounded-xl bg-slate-100 dark:bg-white/5"
        />
      ))}
    </div>
  );
}
