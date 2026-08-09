"use client";

import { MotionSpinner } from "@/components/motion/MotionPrimitives";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Boxes,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TestTube2,
  TimerReset,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { CheckboxField } from "@/components/shared/CheckboxField";
import { CustomSelect } from "@/components/shared/CustomSelect";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/DataTable";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { DateTimeInput } from "@/components/shared/DateTimeInput";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchModal } from "@/components/shared/SearchModal";
import { SegmentedTabs } from "@/components/shared/SegmentedTabs";
import { StatCard } from "@/components/shared/StatCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { StatCardGrid } from "@/components/shared/StatCardGrid";

type ApiTab = "overview" | "clients" | "webhooks" | "policies" | "versions";
type ClientStatus = "active" | "suspended" | "expired";
type Environment = "production" | "sandbox";
type WebhookStatus = "healthy" | "attention" | "paused" | "disabled";

interface ApiClient {
  id: string;
  name: string;
  business: string;
  clientId: string;
  environment: Environment;
  status: ClientStatus;
  scopes: string[];
  lastUsed: string;
  expiresAt: string;
  ipRestricted: boolean;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  business: string;
  url: string;
  events: string[];
  status: WebhookStatus;
  lastDelivery: string;
  successRate: number;
}

interface RatePolicy {
  id: string;
  business: string;
  plan: string;
  perMinute: number;
  monthly: number;
  clients: number;
  webhooks: number;
  usage: number;
  warningThreshold: number;
  autoSuspend: boolean;
}

interface ApiVersion {
  id: string;
  version: string;
  status: "current" | "supported" | "deprecated";
  releasedAt: string;
  retirementAt?: string;
  clients: number;
  lastNotifiedAt?: string;
  notificationCount: number;
}

interface CatalogGroup {
  id: string;
  name: string;
  description: string;
  scope: string;
  endpoints: number;
  enabled: boolean;
  operations: string[];
}

interface ApiBusiness {
  id: string;
  name: string;
  subdomain: string;
}

interface ApiDashboard {
  summary: { activeClients: number; expiringClients: number; webhookAttention: number; businessesNearQuota: number };
  posture: { expiringKeys: number; ipRestricted: number; signedWebhooks: number; rotatedWithin90Days: number };
  businesses: ApiBusiness[];
  clients: Array<Omit<ApiClient, "lastUsed" | "expiresAt"> & { lastUsedAt: string | null; expiresAt: string }>;
  webhooks: Array<Omit<WebhookEndpoint, "lastDelivery"> & { lastDelivery: string | null }>;
  policies: RatePolicy[];
  versions: ApiVersion[];
  catalog: CatalogGroup[];
  pagination: Record<"clients" | "webhooks" | "policies", ApiPagination>;
}

interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiDocumentation {
  version: string;
  basePath: string;
  authentication: string;
  idempotencyHeader: string;
  scopes: string[];
  webhookEvents: string[];
  webhookSignature: string;
  operations: Array<{ method: string; path: string; scope: string }>;
}

const tabs = [
  { id: "overview" as const, label: "پوختە", icon: Gauge },
  { id: "clients" as const, label: "کڕیارەکانی API", icon: KeyRound },
  { id: "webhooks" as const, label: "وێبهووکەکان", icon: Webhook },
  { id: "policies" as const, label: "سنوور و سیاسەت", icon: ShieldCheck },
  { id: "versions" as const, label: "وەشان و کەتەلۆگ", icon: Layers3 },
];

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--multitree-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--multitree-accent)_14%,transparent)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200";

export function APIManagementPage() {
  const [tab, setTab] = useState<ApiTab>("overview");
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [policies, setPolicies] = useState<RatePolicy[]>([]);
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [apiVersions, setApiVersions] = useState<ApiVersion[]>([]);
  const [businesses, setBusinesses] = useState<ApiBusiness[]>([]);
  const [summary, setSummary] = useState({ activeClients: 0, expiringClients: 0, webhookAttention: 0, businessesNearQuota: 0 });
  const [posture, setPosture] = useState({ expiringKeys: 0, ipRestricted: 0, signedWebhooks: 0, rotatedWithin90Days: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [webhookModal, setWebhookModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<RatePolicy | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [versionModal, setVersionModal] = useState(false);
  const [documentation, setDocumentation] = useState<ApiDocumentation | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ApiPagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const request = useCallback(async (path = "", init?: RequestInit) => {
    const response = await fetch(`/api/platform/api-management${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || "API management request failed");
    return payload;
  }, []);

  const load = useCallback(async (notify = false) => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ section: tab, page: String(page), limit: "20" });
      if (query.trim()) params.set("search", query.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const payload = await request(`?${params}`);
      const data = payload.data as ApiDashboard;
      setSummary(data.summary);
      setPosture(data.posture);
      setBusinesses(data.businesses);
      setClients(data.clients.map((item) => ({
        ...item,
        lastUsed: item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "—",
        expiresAt: new Date(item.expiresAt).toLocaleDateString("en-CA"),
      })));
      setWebhooks(data.webhooks.map((item) => ({
        ...item,
        lastDelivery: item.lastDelivery ? new Date(item.lastDelivery).toLocaleString() : "—",
      })));
      setPolicies(data.policies);
      setApiVersions(data.versions.map((item) => ({
        ...item,
        releasedAt: new Date(item.releasedAt).toLocaleDateString("en-CA"),
        retirementAt: item.retirementAt ? new Date(item.retirementAt).toLocaleDateString("en-CA") : undefined,
      })));
      setCatalog(data.catalog);
      if (tab === "clients" || tab === "webhooks" || tab === "policies") {
        setPagination(data.pagination[tab]);
      }
      if (notify) toast.success("زانیارییەکان نوێکرانەوە");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "نەتوانرا زانیارییەکان بهێنرێن");
    } finally {
      setRefreshing(false);
    }
  }, [page, query, request, statusFilter, tab]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredClients = clients;
  const filteredWebhooks = webhooks;
  const filteredPolicies = policies;

  const refresh = () => void load(true);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  };

  const rotateClient = async (id: string) => {
    try {
      const payload = await request(`/clients/${id}/rotate`, { method: "POST" });
      setCreatedSecret(payload.data.secret);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const setClientStatus = async (item: ApiClient) => {
    try {
      await request(`/clients/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status: item.status === "active" ? "suspended" : "active" }) });
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const testWebhook = async (id: string) => {
    try {
      await request(`/webhooks/${id}/test`, { method: "POST" });
      toast.success("Webhook test queued");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const rotateWebhook = async (id: string) => {
    try {
      const payload = await request(`/webhooks/${id}/rotate-secret`, { method: "POST" });
      setCreatedSecret(payload.data.signingSecret);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const setWebhookStatus = async (item: WebhookEndpoint) => {
    try {
      await request(`/webhooks/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status: item.status === "paused" || item.status === "disabled" ? "active" : "paused" }) });
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const notifyVersion = async (id: string) => {
    try {
      await request(`/versions/${id}/notify`, { method: "POST" });
      toast.success("ئاگاداریی وەشان نێردرا");
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const openDocumentation = async () => {
    try {
      const payload = await request("/documentation");
      setDocumentation(payload.data as ApiDocumentation);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };

  const openClientModal = () => {
    if (!businesses.length) return toast.error("پێش دروستکردنی کڕیاری API، بزنسێک دروست بکە");
    setClientModal(true);
  };

  const openWebhookModal = () => {
    if (!businesses.length) return toast.error("پێش زیادکردنی وێبهووک، بزنسێک دروست بکە");
    setWebhookModal(true);
  };

  const clientColumns: DataTableColumn<ApiClient>[] = [
    {
      id: "client",
      header: "کڕیاری API",
      cell: (item) => (
        <div className="min-w-0">
          <p className="font-bold text-slate-700 dark:text-slate-200">{item.name}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">{item.clientId}</p>
        </div>
      ),
    },
    {
      id: "business",
      header: "بزنس",
      cell: (item) => <span className="font-semibold">{item.business}</span>,
    },
    {
      id: "environment",
      header: "ژینگە",
      cell: (item) => <SoftBadge tone={item.environment === "production" ? "purple" : "slate"}>{item.environment === "production" ? "بەرهەم" : "تاقیکردنەوە"}</SoftBadge>,
    },
    {
      id: "scopes",
      header: "دەسەڵاتەکان",
      cell: (item) => <span>{item.scopes.length} دەسەڵات</span>,
    },
    {
      id: "last-used",
      header: "دوا بەکارهێنان",
      cell: (item) => <span>{item.lastUsed}</span>,
    },
    {
      id: "status",
      header: "دۆخ",
      cell: (item) => <ClientStatusBadge status={item.status} />,
    },
    {
      id: "actions",
      header: "کردار",
      className: "w-[148px]",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <IconButton label="نوێکردنەوەی نهێنی" icon={RotateCcw} onClick={() => void rotateClient(item.id)} />
          <IconButton
            label={item.status === "active" ? "ڕاگرتن" : "چالاککردن"}
            icon={item.status === "active" ? Pause : Play}
            danger={item.status === "active"}
            onClick={() => void setClientStatus(item)}
          />
        </div>
      ),
    },
  ];

  const webhookColumns: DataTableColumn<WebhookEndpoint>[] = [
    {
      id: "endpoint",
      header: "وێبهووک",
      cell: (item) => (
        <div className="max-w-[250px] min-w-0">
          <p className="font-bold text-slate-700 dark:text-slate-200">{item.name}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-slate-400" title={item.url}>{item.url}</p>
        </div>
      ),
    },
    { id: "business", header: "بزنس", cell: (item) => <span className="font-semibold">{item.business}</span> },
    { id: "events", header: "ڕووداوەکان", cell: (item) => <span>{item.events.length} ڕووداو</span> },
    { id: "rate", header: "ڕێژەی سەرکەوتن", cell: (item) => <span className={item.successRate < 90 ? "font-bold text-amber-600" : "font-bold text-emerald-600"}>{item.successRate}%</span> },
    { id: "last", header: "دوا گەیاندن", cell: (item) => item.lastDelivery },
    { id: "status", header: "دۆخ", cell: (item) => <WebhookStatusBadge status={item.status} /> },
    {
      id: "actions",
      header: "کردار",
      className: "w-[190px]",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <IconButton label="تاقیکردنەوە" icon={Send} onClick={() => void testWebhook(item.id)} />
          <IconButton label="نوێکردنەوەی نهێنی" icon={RotateCcw} onClick={() => void rotateWebhook(item.id)} />
          <IconButton
            label={item.status === "paused" || item.status === "disabled" ? "چالاککردن" : "ڕاگرتن"}
            icon={item.status === "paused" || item.status === "disabled" ? Play : Pause}
            danger={item.status !== "paused" && item.status !== "disabled"}
            onClick={() => void setWebhookStatus(item)}
          />
        </div>
      ),
    },
  ];

  const policyColumns: DataTableColumn<RatePolicy>[] = [
    { id: "business", header: "بزنس", cell: (item) => <div><p className="font-bold text-slate-700 dark:text-slate-200">{item.business}</p><p className="mt-1 text-[10px] text-slate-400">پلانی {item.plan}</p></div> },
    { id: "minute", header: "لە خولەکێکدا", cell: (item) => `${item.perMinute.toLocaleString()} داواکاری` },
    { id: "month", header: "لە مانگێکدا", cell: (item) => item.monthly.toLocaleString() },
    { id: "clients", header: "کڕیار", cell: (item) => item.clients },
    { id: "webhooks", header: "وێبهووک", cell: (item) => item.webhooks },
    { id: "usage", header: "بەکارهێنان", cell: (item) => <UsageBar value={item.usage} /> },
    { id: "actions", header: "کردار", className: "w-[72px]", cell: (item) => <IconButton label="دەستکاری" icon={Pencil} onClick={() => setSelectedPolicy(item)} /> },
  ];

  const versionColumns: DataTableColumn<ApiVersion>[] = [
    { id: "version", header: "وەشان", cell: (item) => <span className="font-mono text-sm font-black text-slate-700 dark:text-slate-200">{item.version}</span> },
    { id: "status", header: "دۆخ", cell: (item) => <VersionStatusBadge status={item.status} /> },
    { id: "released", header: "بڵاوکراوەتەوە", cell: (item) => item.releasedAt },
    { id: "retirement", header: "کۆتایی پشتگیری", cell: (item) => item.retirementAt || "—" },
    { id: "clients", header: "کڕیاری پەیوەست", cell: (item) => `${item.clients} کڕیار` },
    { id: "actions", header: "کردار", cell: (item) => <button type="button" onClick={() => void notifyVersion(item.id)} className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">ناردنی ئاگاداری</button> },
  ];

  const meta = {
    overview: { title: "APIـی پەڕە گشتییەکان", description: "دروستکردن و دەستکاری Linktree، بەڕێوەبردنی بەستەر و خوێندنەوەی analytics بۆ سیستەمی دەرەکی.", icon: Gauge },
    clients: { title: "کڕیارەکانی API", description: "دەستگەیشتنی بزنس بۆ پەڕە گشتییەکان، بەستەرەکان و analytics بە دەسەڵاتی سنووردار بەڕێوەببە.", icon: KeyRound },
    webhooks: { title: "وێبهووکەکانی پەڕە گشتی", description: "گۆڕانکاری، بڵاوکردنەوە و پوختەی analytics بۆ سیستەمی دەرەکی بنێرە.", icon: Webhook },
    policies: { title: "سنوور و سیاسەتەکان", description: "سنووری داواکاری و تواناکانی API بەپێی پلان یان بزنس دیاری بکە.", icon: ShieldCheck },
    versions: { title: "وەشان و کەتەلۆگی API", description: "وەشانە پشتگیریکراوەکان و گرووپی endpointـە بەردەستەکان بەڕێوەببە.", icon: Layers3 },
  }[tab];

  const showSearch = tab === "clients" || tab === "webhooks" || tab === "policies";

  return (
    <div className="space-y-5" dir="ltr">
      <StatCardGrid>
        <StatCard icon={KeyRound} label="یەکخستنی چالاک" value={summary.activeClients} color="green" />
        <StatCard icon={Clock3} label="کلیل نزیک لە بەسەرچوون" value={summary.expiringClients} color="purple" />
        <StatCard icon={AlertTriangle} label="وێبهووکی پێویست بە سەرنج" value={summary.webhookAttention} color="orange" />
        <StatCard icon={Gauge} label="بزنس نزیک لە سنوور" value={summary.businessesNearQuota} color="blue" />
      </StatCardGrid>

      <SegmentedTabs tabs={tabs} value={tab} onChange={(value) => { setTab(value); clearFilters(); }} accent="var(--multitree-accent)" />

      <section className="min-h-[520px] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-6">
        <PageHeader
          title={meta.title}
          description={meta.description}
          icon={meta.icon}
          action={
            <>
              <button type="button" onClick={refresh} className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10" aria-label="نوێکردنەوە">
                <MotionSpinner active={refreshing}><RefreshCw className="h-4 w-4"  /></MotionSpinner>
              </button>
              {showSearch && (
                <button type="button" onClick={() => setSearchOpen(true)} className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold shadow-sm transition hover:bg-slate-50 dark:hover:bg-white/10 ${query || statusFilter !== "all" ? "sa-soft sa-soft-border" : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300"}`}>
                  <SlidersHorizontal className="h-4 w-4" />
                  گەڕان و پاڵاوتن
                  {(query || statusFilter !== "all") && <span className="sa-gradient flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-black text-white">{Number(Boolean(query)) + Number(statusFilter !== "all")}</span>}
                </button>
              )}
              {tab === "clients" && <PrimaryButton icon={Plus} label="کڕیاری نوێ" onClick={openClientModal} />}
              {tab === "webhooks" && <PrimaryButton icon={Plus} label="وێبهووکی نوێ" onClick={openWebhookModal} />}
              {tab === "versions" && <PrimaryButton icon={Plus} label="وەشانی نوێ" onClick={() => setVersionModal(true)} />}
            </>
          }
        />

        <div className="border-t border-slate-100 pt-5 dark:border-white/5">
          {tab === "overview" && <Overview summary={summary} posture={posture} onChangeTab={(value) => { setTab(value); setPage(1); }} onCreateClient={openClientModal} onCreateWebhook={openWebhookModal} onOpenDocumentation={() => void openDocumentation()} />}
          {tab === "clients" && <DataTable items={filteredClients} columns={clientColumns} rowKey={(item) => item.id} emptyTitle="هیچ کڕیارێکی API نەدۆزرایەوە" minWidthClassName="min-w-[1020px]" />}
          {tab === "webhooks" && <DataTable items={filteredWebhooks} columns={webhookColumns} rowKey={(item) => item.id} emptyTitle="هیچ وێبهووکێک نەدۆزرایەوە" minWidthClassName="min-w-[1040px]" />}
          {tab === "policies" && <PoliciesContent policies={filteredPolicies} columns={policyColumns} />}
          {tab === "versions" && <VersionsContent versions={apiVersions} columns={versionColumns} catalog={catalog} onToggle={(id) => {
            const group = catalog.find((item) => item.id === id);
            if (!group) return;
            void request(`/catalog/${id}`, { method: "PATCH", body: JSON.stringify({ enabled: !group.enabled }) })
              .then(() => load())
              .catch((error) => toast.error(error instanceof Error ? error.message : "Request failed"));
          }} />}
          {(tab === "clients" || tab === "webhooks" || tab === "policies") && (
            <TablePagination
              page={page}
              pageSize={pagination.limit}
              totalItems={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      </section>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} searchQuery={query} onSearchQueryChange={(value) => { setQuery(value); setPage(1); }} placeholder="ناوی کڕیار، بزنس، Client ID یان URL بنووسە..." wide>
        <div className="grid gap-3 sm:grid-cols-2">
          {(tab === "clients" || tab === "webhooks") && (
            <CustomSelect label="دۆخ" value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={tab === "clients" ? [
              { value: "all", label: "هەموو دۆخەکان" }, { value: "active", label: "چالاک" }, { value: "suspended", label: "ڕاگیراو" }, { value: "expired", label: "بەسەرچوو" },
            ] : [
              { value: "all", label: "هەموو دۆخەکان" }, { value: "healthy", label: "ساغ" }, { value: "attention", label: "پێویست بە سەرنج" }, { value: "paused", label: "ڕاگیراو" }, { value: "disabled", label: "ناچالاک" },
            ]} />
          )}
          <button type="button" onClick={clearFilters} className="mt-auto h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-500 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">پاککردنەوەی پاڵاوتنەکان</button>
        </div>
      </SearchModal>

      {clientModal && <CreateClientModal businesses={businesses} onClose={() => setClientModal(false)} onCreate={async (body) => { const payload = await request("/clients", { method: "POST", body: JSON.stringify(body) }); setClientModal(false); setCreatedSecret(payload.data.secret); await load(); }} />}
      {webhookModal && <CreateWebhookModal businesses={businesses} onClose={() => setWebhookModal(false)} onValidate={async (url) => (await request("/webhooks/validate", { method: "POST", body: JSON.stringify({ url }) })).data} onCreate={async (body) => { const payload = await request("/webhooks", { method: "POST", body: JSON.stringify(body) }); setWebhookModal(false); setCreatedSecret(payload.data.signingSecret); await load(); }} />}
      {selectedPolicy && <PolicyModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} onSave={async (next) => { await request(`/policies/${next.id}`, { method: "PATCH", body: JSON.stringify({ requestsPerMinute: next.perMinute, requestsMonthly: next.monthly, apiClientLimit: next.clients, webhookEndpointLimit: next.webhooks, warningThreshold: next.warningThreshold, autoSuspend: next.autoSuspend }) }); setSelectedPolicy(null); toast.success("سیاسەتەکە پاشەکەوتکرا"); await load(); }} />}
      {createdSecret && <SecretModal secret={createdSecret} onClose={() => setCreatedSecret(null)} />}
      {versionModal && <CreateVersionModal onClose={() => setVersionModal(false)} onCreate={async (body) => { await request("/versions", { method: "POST", body: JSON.stringify(body) }); setVersionModal(false); toast.success("وەشانەکە زیادکرا"); await load(); }} />}
      {documentation && <DocumentationModal documentation={documentation} onClose={() => setDocumentation(null)} />}
    </div>
  );
}

function Overview({ summary, posture, onChangeTab, onCreateClient, onCreateWebhook, onOpenDocumentation }: {
  summary: ApiDashboard["summary"];
  posture: ApiDashboard["posture"];
  onChangeTab: (tab: ApiTab) => void;
  onCreateClient: () => void;
  onCreateWebhook: () => void;
  onOpenDocumentation: () => void;
}) {
  const attention = [
    summary.expiringClients > 0 ? { icon: Clock3, title: `${summary.expiringClients} کلیل تا 30 ڕۆژی داهاتوو بەسەردەچن`, description: "پێش بەسەرچوون نهێنییەکان بگۆڕە تا خزمەتگوزاری نەوەستێت.", action: "بینینی کڕیارەکان", tab: "clients" as const, tone: "amber" } : null,
    summary.webhookAttention > 0 ? { icon: Webhook, title: `${summary.webhookAttention} endpoint پێویستیان بە سەرنجدان هەیە`, description: "گەیاندنە شکستخواردووەکان بپشکنە و endpointـەکان تاقی بکەرەوە.", action: "بینینی وێبهووکەکان", tab: "webhooks" as const, tone: "red" } : null,
    summary.businessesNearQuota > 0 ? { icon: Gauge, title: `${summary.businessesNearQuota} بزنس لە 80%ی سنووری مانگانەن`, description: "پێش گەیشتن بە سنوور، پلان یان سنووری تایبەت پێداچوونەوەی بۆ بکە.", action: "بینینی سنوورەکان", tab: "policies" as const, tone: "blue" } : null,
  ].filter(Boolean) as Array<{ icon: typeof Clock3; title: string; description: string; action: string; tab: ApiTab; tone: string }>;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">پێویست بە سەرنجدان</h3>
            <span className="text-[10px] font-semibold text-slate-400">{attention.length} بابەت</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 dark:divide-white/5 dark:border-white/10">
            {attention.length === 0 && <div className="flex items-center gap-3 p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"><Check className="h-5 w-5" /></div><p className="text-xs font-bold text-slate-600 dark:text-slate-300">هیچ بابەتێک پێویستی بە سەرنجدان نییە.</p></div>}
            {attention.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/60 dark:hover:bg-white/[0.03] sm:flex-row sm:items-center">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.tone === "red" ? "bg-red-50 text-red-500 dark:bg-red-500/10" : item.tone === "amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10" : "bg-sky-50 text-sky-600 dark:bg-sky-500/10"}`}><item.icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-700 dark:text-slate-200">{item.title}</p><p className="mt-1 text-[10px] leading-5 text-slate-400">{item.description}</p></div>
                <button type="button" onClick={() => onChangeTab(item.tab)} className="h-9 shrink-0 rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">{item.action}</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">کرداری خێرا</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <QuickAction icon={KeyRound} title="یەکخستنی Linktree دروست بکە" description="Client ID بۆ دروستکردن، دەستکاری و بینینی پەڕەکان." onClick={onCreateClient} />
            <QuickAction icon={Webhook} title="وێبهووکی گۆڕانکاری زیاد بکە" description="بڵاوکردنەوە، دەستکاری و پوختەی analytics بنێرە." onClick={onCreateWebhook} />
            <QuickAction icon={BookOpen} title="بەڵگەنامەی Linktree API" description="endpoint، scope و نموونەی دروستکردنی پەڕە ببینە." onClick={onOpenDocumentation} />
          </div>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">بەکارهێنانە سەرەکییەکان</h3>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <UseCase icon={Plus} title="دروستکردنی پەڕە" description="Linktree و بەستەرەکان لە CMS یان ئەپی دەرەکی دروست بکە." />
          <UseCase icon={Pencil} title="نوێکردنەوەی خۆکار" description="ناوەڕۆک، ڕیزبەندی و دۆخی بڵاوکردنەوە هاوکات بکە." />
          <UseCase icon={Gauge} title="ڕاپۆرتی Analytics" description="ئامار بۆ BI، داشبۆرد یان ڕاپۆرتی تایبەت بخوێنەوە." />
          <UseCase icon={RefreshCw} title="Sync و Automation" description="CRM، e-commerce یان campaign system بە گۆڕانکاری ئاگادار بکەوە." />
        </div>
        <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">دۆخی پاراستنی API</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PostureItem icon={LockKeyhole} label="کلیلە ماوەدارەکان" value={`${posture.expiringKeys}%`} good={posture.expiringKeys === 100} />
          <PostureItem icon={Network} label="IP سنووردارکراو" value={`${posture.ipRestricted}%`} />
          <PostureItem icon={ShieldCheck} label="واژۆی وێبهووک" value={`${posture.signedWebhooks}%`} good={posture.signedWebhooks === 100} />
          <PostureItem icon={TimerReset} label="ڕۆتێشنی 90 ڕۆژ" value={`${posture.rotatedWithin90Days}%`} good={posture.rotatedWithin90Days === 100} />
        </div>
      </div>
    </div>
  );
}

function PoliciesContent({ policies, columns }: { policies: RatePolicy[]; columns: DataTableColumn<RatePolicy>[] }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <PolicyFeature icon={Zap} title="سنووری خولەکی" description="پاراستن لە بارگرانی زۆر و بەکارهێنانی نائاسایی." enabled />
        <PolicyFeature icon={Ban} title="وەستاندنی خۆکار" description="کڕیاری گومانلێکراو دوای تێپەڕاندنی سنوور ڕابگرە." enabled={policies.some((policy) => policy.autoSuspend)} />
        <PolicyFeature icon={Network} title="IP Allowlist" description="دەستگەیشتن تەنها بۆ IPـە متمانەپێکراوەکان." enabled />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-black text-slate-700 dark:text-slate-200">ستانداردەکانی Automation</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PolicyFeature icon={Copy} title="Idempotency Keys" description="لە retryـدا پەڕە یان بەستەری دووبارە دروست ناکات." enabled />
          <PolicyFeature icon={ExternalLink} title="External IDs" description="تۆماری CRM، CMS یان store بە پەڕە و بەستەر پەیوەست دەکات." enabled />
          <PolicyFeature icon={Boxes} title="Bulk Operations" description="چەندین پەڕە و بەستەر بە یەک داواکاری بەڕێوەدەبات." enabled />
        </div>
      </div>
      <DataTable items={policies} columns={columns} rowKey={(item) => item.id} emptyTitle="هیچ سیاسەتێک نەدۆزرایەوە" minWidthClassName="min-w-[900px]" />
    </div>
  );
}

function VersionsContent({ versions, columns, catalog, onToggle }: { versions: ApiVersion[]; columns: DataTableColumn<ApiVersion>[]; catalog: CatalogGroup[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-7">
      <div>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-slate-700 dark:text-slate-200">وەشانەکان</h3><span className="text-[10px] font-semibold text-slate-400">{versions.length} وەشان</span></div>
        <DataTable items={versions} columns={columns} rowKey={(item) => item.id} emptyTitle="هیچ وەشانێک نییە" minWidthClassName="min-w-[760px]" />
      </div>
      <div className="border-t border-slate-100 pt-6 dark:border-white/5">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-black text-slate-700 dark:text-slate-200">کەتەلۆگی Endpoint</h3><p className="mt-1 text-[10px] text-slate-400">گرووپی API و دەسەڵاتی پێویست بۆ هەر یەکێک.</p></div></div>
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.map((group) => (
            <div key={group.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 p-4 transition hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sa-soft sa-accent-text"><Boxes className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-black text-slate-700 dark:text-slate-200">{group.name}</h4><SoftBadge tone="slate">{group.endpoints} endpoint</SoftBadge></div>
                <p className="mt-1 text-[10px] leading-5 text-slate-400">{group.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">{group.operations.map((operation) => <span key={operation} className="rounded-md bg-slate-50 px-1.5 py-1 text-[8px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">{operation}</span>)}</div>
                <code className="mt-2 block break-all text-[9px] text-slate-500 dark:text-slate-400">{group.scope}</code>
              </div>
              <Toggle checked={group.enabled} onChange={() => onToggle(group.id)} label={`${group.name} ${group.enabled ? "ناچالاک" : "چالاک"} بکە`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateClientModal({ businesses, onClose, onCreate }: { businesses: ApiBusiness[]; onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState(businesses[0]?.id || "");
  const environment: Environment = "production";
  const [expiresIn, setExpiresIn] = useState("180");
  const [accessPreset, setAccessPreset] = useState("custom");
  const [scopes, setScopes] = useState(["linktrees:read"]);
  const [ipRestricted, setIpRestricted] = useState(false);
  const [ipAddresses, setIpAddresses] = useState("");
  const availableScopes = ["linktrees:read", "linktrees:write", "linktrees:publish", "linktrees:delete", "links:read", "links:manage", "assets:read", "assets:write", "slugs:write", "schedules:read", "schedules:write", "templates:read", "bulk:write", "analytics:read", "analytics:export"];
  const applyPreset = (preset: string) => {
    setAccessPreset(preset);
    if (preset === "read") setScopes(["linktrees:read", "analytics:read"]);
    if (preset === "manage") setScopes(["linktrees:read", "linktrees:write", "linktrees:publish", "links:read", "links:manage", "assets:read", "assets:write", "slugs:write", "schedules:read", "schedules:write", "templates:read"]);
    if (preset === "analytics") setScopes(["linktrees:read", "analytics:read", "analytics:export"]);
    if (preset === "full") setScopes(availableScopes);
  };
  const submit = async () => {
    if (name.trim().length < 3) return toast.error("ناوی کڕیار لانیکەم 3 پیت بێت");
    if (!scopes.length) return toast.error("لانیکەم یەک دەسەڵات هەڵبژێرە");
    if (!business) return toast.error("بزنسێک هەڵبژێرە");
    try {
      const ipAllowlist = ipRestricted ? ipAddresses.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean) : [];
      if (ipRestricted && !ipAllowlist.length) return toast.error("لانیکەم یەک IP بنووسە");
      await onCreate({ businessId: business, name: name.trim(), environment, scopes, expiresAt: new Date(Date.now() + Number(expiresIn) * 86400000).toISOString(), ipAllowlist });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };
  return (
    <ManagementModal isOpen onClose={onClose} title="یەکخستنی Linktree API" description="دەسەڵاتی دروستکردن، دەستکاری، بڵاوکردنەوە یان analytics بە کەمترین پێویستی بزنس دیاری بکە." createBusinessStyle wide footer={<><SecondaryButton label="هەڵوەشاندنەوە" onClick={onClose} /><PrimaryButton icon={KeyRound} label="دروستکردنی کڕیار" onClick={submit} full /></>}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ناوی کڕیار"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="بۆ نموونە: Storefront Production" /></Field>
        <CustomSelect label="بزنس" value={business} onChange={setBusiness} options={businesses.map((item) => ({ value: item.id, label: item.name }))} triggerClassName="h-11" />
        <CustomSelect label="ماوەی کلیل" value={expiresIn} onChange={setExpiresIn} options={[{ value: "30", label: "30 ڕۆژ" }, { value: "90", label: "90 ڕۆژ" }, { value: "180", label: "180 ڕۆژ" }, { value: "365", label: "1 ساڵ" }]} triggerClassName="h-11" />
        <div className="sm:col-span-2"><CustomSelect label="پڕۆفایلی دەستگەیشتن" value={accessPreset} onChange={applyPreset} options={[{ value: "custom", label: "هەڵبژاردنی دەستی" }, { value: "read", label: "تەنها بینین" }, { value: "manage", label: "بەڕێوەبردنی پەڕە" }, { value: "analytics", label: "Analytics و ڕاپۆرت" }, { value: "full", label: "دەستگەیشتنی تەواو" }]} triggerClassName="h-11" /></div>
        <div className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">دەسەڵاتەکان</span><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availableScopes.map((scope) => <CheckboxField key={scope} compact checked={scopes.includes(scope)} onChange={() => { setAccessPreset("custom"); setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]); }} label={scope} />)}</div></div>
        <div className="sm:col-span-2"><CheckboxField checked={ipRestricted} onChange={setIpRestricted} label="سنووردارکردن بە IP" description="دوای دروستکردن، IPـە متمانەپێکراوەکان زیاد بکە." /></div>
        {ipRestricted && <div className="sm:col-span-2"><Field label="IPـە متمانەپێکراوەکان"><input className={inputClass} dir="ltr" value={ipAddresses} onChange={(event) => setIpAddresses(event.target.value)} placeholder="203.0.113.10, 2001:db8::1" /></Field></div>}
      </div>
    </ManagementModal>
  );
}

function CreateWebhookModal({ businesses, onClose, onValidate, onCreate }: { businesses: ApiBusiness[]; onClose: () => void; onValidate: (url: string) => Promise<{ status: number; latencyMs: number }>; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const [name, setName] = useState("");
  const [business, setBusiness] = useState(businesses[0]?.id || "");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState(["linktree.updated"]);
  const [validating, setValidating] = useState(false);
  const availableEvents = ["linktree.created", "linktree.updated", "linktree.cloned", "linktree.scheduled", "linktree.published", "linktree.unpublished", "linktree.deleted", "asset.processed", "campaign.expired", "analytics.daily_summary", "analytics.export_ready", "analytics.threshold_reached"];
  const submit = async () => {
    if (name.trim().length < 3) return toast.error("ناوی وێبهووک لانیکەم 3 پیت بێت");
    try { const parsed = new URL(url); if (parsed.protocol !== "https:") throw new Error(); } catch { return toast.error("URLـێکی دروستی HTTPS بنووسە"); }
    if (!events.length) return toast.error("لانیکەم یەک ڕووداو هەڵبژێرە");
    if (!business) return toast.error("بزنسێک هەڵبژێرە");
    try { await onCreate({ businessId: business, name: name.trim(), url, events }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };
  const validate = async () => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
    } catch { return toast.error("URLـێکی دروستی HTTPS بنووسە"); }
    setValidating(true);
    try {
      const result = await onValidate(url);
      toast.success(`Endpoint وەڵامی ${result.status} دایە لە ${result.latencyMs}ms`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
    finally { setValidating(false); }
  };
  return (
    <ManagementModal isOpen onClose={onClose} title="وێبهووکی Linktree" description="گۆڕانکاری پەڕە، دۆخی بڵاوکردنەوە یان پوختەی analytics بۆ endpointـێکی HTTPS بنێرە." createBusinessStyle wide footer={<><SecondaryButton label="هەڵوەشاندنەوە" onClick={onClose} /><button type="button" disabled={validating} onClick={() => void validate()} className="h-11 w-full rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 sm:flex-1"><span className="inline-flex items-center gap-2"><TestTube2 className="h-4 w-4" />{validating ? "پشکنین..." : "تاقیکردنەوە"}</span></button><PrimaryButton icon={Webhook} label="زیادکردنی وێبهووک" onClick={submit} full /></>}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ناوی وێبهووک"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="بۆ نموونە: CRM Sync" /></Field>
        <CustomSelect label="بزنس" value={business} onChange={setBusiness} options={businesses.map((item) => ({ value: item.id, label: item.name }))} triggerClassName="h-11" />
        <div className="sm:col-span-2"><Field label="Endpoint URL"><input className={inputClass} dir="ltr" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhooks/multitree" /></Field></div>
        <div className="sm:col-span-2"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">ڕووداوەکان</span><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availableEvents.map((event) => <CheckboxField key={event} compact checked={events.includes(event)} onChange={() => setEvents((current) => current.includes(event) ? current.filter((item) => item !== event) : [...current, event])} label={event} />)}</div></div>
      </div>
    </ManagementModal>
  );
}

function PolicyModal({ policy, onClose, onSave }: { policy: RatePolicy; onClose: () => void; onSave: (policy: RatePolicy) => Promise<void> }) {
  const [form, setForm] = useState(policy);
  return (
    <ManagementModal isOpen onClose={onClose} title={`سیاسەتی ${policy.business}`} description="سنووری تایبەت تەنها بۆ ئەم بزنسە جێبەجێ دەبێت." createBusinessStyle footer={<><SecondaryButton label="هەڵوەشاندنەوە" onClick={onClose} /><PrimaryButton icon={Check} label="پاشەکەوتکردن" onClick={() => onSave(form)} full /></>}>
      <div className="grid gap-5 sm:grid-cols-2">
        <NumberField label="داواکاری لە خولەکێکدا" value={form.perMinute} onChange={(value) => setForm({ ...form, perMinute: value })} />
        <NumberField label="داواکاری لە مانگێکدا" value={form.monthly} onChange={(value) => setForm({ ...form, monthly: value })} />
        <NumberField label="زۆرترین کڕیار" value={form.clients} onChange={(value) => setForm({ ...form, clients: value })} />
        <NumberField label="زۆرترین وێبهووک" value={form.webhooks} onChange={(value) => setForm({ ...form, webhooks: value })} />
        <NumberField label="ئاگادارکردنەوە لە ڕێژەی" value={form.warningThreshold} onChange={(value) => setForm({ ...form, warningThreshold: Math.min(100, value) })} />
        <div className="self-end"><CheckboxField checked={form.autoSuspend} onChange={(value) => setForm({ ...form, autoSuspend: value })} label="وەستاندنی خۆکار" description="لە گەیشتن بە سنووری مانگانە کڕیارە چالاکەکان ڕابگرە." /></div>
      </div>
    </ManagementModal>
  );
}

function CreateVersionModal({ onClose, onCreate }: { onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const now = new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState<ApiVersion["status"]>("supported");
  const [releasedAt, setReleasedAt] = useState(local);
  const [hasRetirement, setHasRetirement] = useState(false);
  const [retirementAt, setRetirementAt] = useState("");
  const submit = async () => {
    if (!/^v[1-9]\d*$/.test(version.trim().toLowerCase())) return toast.error("وەشان بە شێوەی v1 یان v2 بنووسە");
    if (!releasedAt) return toast.error("ڕێکەوتی بڵاوکردنەوە دیاری بکە");
    if (hasRetirement && !retirementAt) return toast.error("ڕێکەوتی کۆتایی پشتگیری دیاری بکە");
    try {
      await onCreate({ version: version.trim().toLowerCase(), status, releasedAt: new Date(releasedAt).toISOString(), retirementAt: hasRetirement ? new Date(retirementAt).toISOString() : undefined });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
  };
  return (
    <ManagementModal isOpen onClose={onClose} title="زیادکردنی وەشانی API" description="تەنها وەشانێک تۆمار بکە کە endpointـەکانی لە production بڵاوکراونەتەوە." createBusinessStyle footer={<><SecondaryButton label="هەڵوەشاندنەوە" onClick={onClose} /><PrimaryButton icon={Layers3} label="زیادکردنی وەشان" onClick={() => void submit()} full /></>}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="وەشان"><input className={inputClass} dir="ltr" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="بۆ نموونە: v2" /></Field>
        <CustomSelect label="دۆخ" value={status} onChange={setStatus} options={[{ value: "current", label: "ئێستا" }, { value: "supported", label: "پشتگیری‌کراو" }, { value: "deprecated", label: "کۆنکراو" }]} triggerClassName="h-11" />
        <DateTimeInput label="کاتی بڵاوکردنەوە" value={releasedAt} onChange={setReleasedAt} min={local} />
        <div className="self-end"><CheckboxField checked={hasRetirement} onChange={setHasRetirement} label="کۆتایی پشتگیری هەبێت" /></div>
        {hasRetirement && <div className="sm:col-span-2"><DateTimeInput label="کاتی کۆتایی پشتگیری" value={retirementAt} onChange={setRetirementAt} min={releasedAt || local} /></div>}
      </div>
    </ManagementModal>
  );
}

function DocumentationModal({ documentation, onClose }: { documentation: ApiDocumentation; onClose: () => void }) {
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); toast.success("کۆپی کرا"); };
  return (
    <ManagementModal isOpen onClose={onClose} title={`بەڵگەنامەی API ${documentation.version}`} description="ڕێڕەو، method و دەسەڵاتی پێویست بۆ APIـی Linktree." createBusinessStyle wide footer={<SecondaryButton label="داخستن" onClick={onClose} />}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ label: "Base path", value: documentation.basePath }, { label: "Authentication", value: documentation.authentication }, { label: "Idempotency", value: documentation.idempotencyHeader }, { label: "Webhook signature", value: documentation.webhookSignature }].map((item) => <button type="button" key={item.label} onClick={() => void copy(item.value)} className="min-w-0 rounded-xl border border-slate-200 p-3 text-left transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><span className="block text-[10px] font-bold text-slate-400">{item.label}</span><code className="mt-1 block truncate text-xs text-slate-700 dark:text-slate-200">{item.value}</code></button>)}
        </div>
        <div><h3 className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">Endpointـەکان</h3><div className="max-h-[340px] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">{documentation.operations.map((operation) => <div key={`${operation.method}-${operation.path}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 border-b border-slate-100 p-3 last:border-b-0 dark:border-white/5 sm:grid-cols-[64px_minmax(0,1fr)_180px]"><span className="font-mono text-[10px] font-black text-[var(--multitree-accent)]">{operation.method}</span><code className="truncate text-[10px] text-slate-700 dark:text-slate-200">{documentation.basePath}{operation.path}</code><code className="col-start-2 truncate text-[9px] text-slate-400 sm:col-start-auto">{operation.scope}</code></div>)}</div></div>
      </div>
    </ManagementModal>
  );
}

function SecretModal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const copy = async () => { await navigator.clipboard.writeText(secret); toast.success("نهێنییەکە کۆپی کرا"); };
  return (
    <ManagementModal isOpen onClose={onClose} title="کڕیاری API دروستکرا" description="ئەم نهێنییە تەنها ئەم جارە پیشان دەدرێت. لە شوێنێکی پارێزراو هەڵیبگرە." createBusinessStyle footer={<PrimaryButton icon={Check} label="هەڵمگرت و تەواو" onClick={onClose} full />}>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"><div className="mb-3 flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><p className="text-xs font-semibold leading-5 text-amber-800 dark:text-amber-300">دوای داخستنی ئەم پەنجەرەیە نهێنییەکە دووبارە پیشان نادرێتەوە.</p></div><div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-2 dark:border-amber-900/40 dark:bg-[#161B22]"><code className="min-w-0 flex-1 break-all px-2 text-xs text-slate-700 dark:text-slate-200">{secret}</code><button type="button" onClick={() => void copy()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sa-gradient text-white"><Copy className="h-4 w-4" /></button></div></div>
    </ManagementModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <Field label={label}><input type="number" min={1} className={inputClass} value={value} onChange={(event) => onChange(Math.max(1, Number(event.target.value)))} /></Field>; }

function PrimaryButton({ icon: Icon, label, onClick, full = false }: { icon: typeof Plus; label: string; onClick: () => void; full?: boolean }) { return <button type="button" onClick={onClick} className={`sa-gradient flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-md transition hover:brightness-95 ${full ? "h-11 w-full sm:flex-1" : ""}`}><Icon className="h-4 w-4" />{label}</button>; }
function SecondaryButton({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 sm:flex-1">{label}</button>; }
function IconButton({ label, icon: Icon, onClick, danger = false }: { label: string; icon: typeof Plus; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${danger ? "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/20" : "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"}`}><Icon className="h-3.5 w-3.5" /></button>; }

function QuickAction({ icon: Icon, title, description, onClick }: { icon: typeof Plus; title: string; description: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 p-3.5 text-left transition hover:border-[color-mix(in_srgb,var(--multitree-accent)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--multitree-accent)_4%,transparent)] dark:border-white/10"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sa-soft sa-accent-text"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-slate-700 dark:text-slate-200">{title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{description}</span></span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-[var(--multitree-accent)]" /></button>; }
function UseCase({ icon: Icon, title, description }: { icon: typeof Plus; title: string; description: string }) { return <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-white/10"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sa-soft sa-accent-text"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{description}</p></div></div>; }
function PostureItem({ icon: Icon, label, value, good = false }: { icon: typeof Plus; label: string; value: string; good?: boolean }) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-white/10"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${good ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "sa-soft sa-accent-text"}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="text-lg font-black text-slate-700 dark:text-slate-200">{value}</p><p className="truncate text-[10px] text-slate-400">{label}</p></div></div>; }
function PolicyFeature({ icon: Icon, title, description, enabled }: { icon: typeof Plus; title: string; description: string; enabled: boolean }) { return <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-white/10"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sa-soft sa-accent-text"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-xs font-black text-slate-700 dark:text-slate-200">{title}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">{description}</p></div><SoftBadge tone={enabled ? "green" : "slate"}>{enabled ? "چالاک" : "ئارەزوومەندانە"}</SoftBadge></div>; }
function UsageBar({ value }: { value: number }) { return <div className="w-28"><div className="mb-1 flex justify-between text-[9px]"><span>{value}%</span><span className="text-slate-400">100%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full ${value >= 90 ? "bg-red-500" : value >= 75 ? "bg-amber-500" : "bg-[var(--multitree-accent)]"}`} style={{ width: `${value}%` }} /></div></div>; }
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) { return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[var(--multitree-accent)]" : "bg-slate-200 dark:bg-white/10"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} /></button>; }

function SoftBadge({ tone, children }: { tone: "green" | "amber" | "red" | "purple" | "slate"; children: React.ReactNode }) { const classes = { green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300", purple: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300", slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300" }; return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black ${classes[tone]}`}>{children}</span>; }
function ClientStatusBadge({ status }: { status: ClientStatus }) { const data = { active: ["چالاک", "green"], suspended: ["ڕاگیراو", "amber"], expired: ["بەسەرچوو", "red"] } as const; return <SoftBadge tone={data[status][1]}>{data[status][0]}</SoftBadge>; }
function WebhookStatusBadge({ status }: { status: WebhookStatus }) { const data = { healthy: ["ساغ", "green"], attention: ["پێویست بە سەرنج", "red"], paused: ["ڕاگیراو", "slate"], disabled: ["ناچالاک", "red"] } as const; return <SoftBadge tone={data[status][1]}>{data[status][0]}</SoftBadge>; }
function VersionStatusBadge({ status }: { status: ApiVersion["status"] }) { const data = { current: ["ئێستا", "green"], supported: ["پشتگیریکراو", "purple"], deprecated: ["کۆنکراو", "amber"] } as const; return <SoftBadge tone={data[status][1]}>{data[status][0]}</SoftBadge>; }
