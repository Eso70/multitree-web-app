"use client";

import {
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  FileText,
  LayoutGrid,
  SendHorizontal,
} from "lucide-react";
import {
  BusinessTrustedBy,
  type TrustedPartner,
} from "@/components/business/BusinessTrustedBy";
import { BusinessAbout } from "@/components/business/BusinessAbout";
import { BusinessDigitalPresenceShowcase } from "@/components/business/BusinessDigitalPresenceShowcase";
import { BusinessMobileShowcase } from "@/components/business/BusinessMobileShowcase";
import { BusinessHero } from "@/components/business/BusinessHero";
import { BusinessPublicSiteShell } from "@/components/business/BusinessPublicSiteShell";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import {
  BUSINESS_LANDING_DECORATION_COLORS,
  BUSINESS_LANDING_DECORATION_LABELS,
  BUSINESS_LANDING_SECTION_HREFS,
  BUSINESS_LANDING_SECTION_IDS,
} from "@/components/business/business-landing-sections";
import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";

interface BusinessData {
  id: string;
  name: string;
  subdomain: string;
  logo?: string | null;
  favicon?: string | null;
  default_avatar?: string | null;
  website_color?: string | null;
  background_color?: string | null;
  footer_text?: string | null;
  footer_phone?: string | null;
  template_key?: string | null;
  whatsapp_enabled?: boolean | null;
  /** True only when this business has a live advertising page; see the public business endpoint. */
  advertising_enabled?: boolean | null;
  /** True when the plan includes removing the MultiTree badge. */
  branding_removed?: boolean | null;
  trusted_partners?: TrustedPartner[] | null;
}

interface LinktreeItem {
  id: string;
  name: string;
  uid: string;
  seo_name?: string | null;
  image?: string | null;
  subtitle?: string | null;
}

type WorkspaceTabId = "linktrees";

function PublicContentCard({
  href,
  name,
  description,
  image,
  index,
}: {
  href: string;
  name: string;
  description?: string | null;
  image?: string | null;
  index: number;
}) {
  const featured = index % 5 === 0 || index % 5 === 3;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${name} — لە تابێکی نوێدا دەکرێتەوە`}
      className={`group relative min-h-0 overflow-hidden rounded-2xl border border-black/10 bg-transparent shadow-[0_14px_34px_-24px_rgba(15,23,42,.38)] transition-[border-color,box-shadow] hover:border-black/20 hover:shadow-[0_18px_42px_-22px_rgba(15,23,42,.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/45 dark:border-white/10 dark:hover:border-white/20 dark:focus-visible:ring-white/60 dark:hover:shadow-[0_20px_46px_-24px_rgba(0,0,0,.8)] ${featured ? "row-span-2" : "row-span-1"}`}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 34vw, 46vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-transparent">
          <span
            aria-hidden="true"
            className="absolute inset-4 rounded-xl border border-black/15 dark:border-white/15"
          />
          <span className="absolute inset-0 flex items-center justify-center text-5xl font-semibold text-[#17191b] dark:text-white">
            {name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      <span className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-white sm:p-4">
        <div className="min-w-0" dir="auto">
          <h3 className="truncate text-sm font-semibold sm:text-base">{name}</h3>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-[0.68rem] leading-4 text-white/65 sm:text-xs">
              {description}
            </p>
          )}
        </div>
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/14 text-white transition-colors group-hover:bg-white group-hover:text-black"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export function BusinessWorkspaceSection({
  linktrees,
}: {
  linktrees: LinktreeItem[];
}) {
  const tabs: Array<{
    id: WorkspaceTabId;
    label: string;
  }> = [
    ...(linktrees.length > 0
      ? [
          {
            id: "linktrees" as const,
            label: "لینکترییەکان",
          },
        ]
      : []),
  ];
  const initialTab: WorkspaceTabId = "linktrees";
  const [selectedTab, setSelectedTab] = useState<WorkspaceTabId>(initialTab);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<
    Array<{ role: "assistant" | "visitor"; text: string }>
  >([{ role: "assistant", text: "سڵاو! چۆن یارمەتیت بدەم؟" }]);
  const activeTab = tabs.some((tab) => tab.id === selectedTab)
    ? selectedTab
    : tabs[0]?.id || initialTab;

  const selectAdjacentTab = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: WorkspaceTabId,
  ) => {
    if (
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setSelectedTab(nextTab.id);
    requestAnimationFrame(() => {
      document
        .getElementById(`business-workspace-tab-${nextTab.id}`)
        ?.focus();
    });
  };

  const handleAssistantSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = assistantInput.trim();
    if (!message) return;
    const normalized = message.toLocaleLowerCase();
    const isGreeting = /\b(hello|hi|hey)\b/.test(normalized) || normalized.includes("سڵاو");
    const reply = isGreeting
      ? "سڵاو! 👋"
      : "بۆ لینکـتری یان ماڵپەڕی بچووک، تکایە لەگەڵ خاوەنی بیزنسەکە قسە بکە.";
    setAssistantMessages((current) =>
      [
        ...current,
        { role: "visitor" as const, text: message },
        { role: "assistant" as const, text: reply },
      ].slice(-5),
    );
    setAssistantInput("");
  };

  if (tabs.length === 0) return null;

  return (
    <section
      id={BUSINESS_LANDING_SECTION_IDS.workspace}
      aria-label="ناوەڕۆکی گشتی"
      className="relative scroll-mt-24 overflow-hidden bg-transparent px-5 py-24 text-[#111827] dark:text-white sm:px-8 sm:py-28 lg:py-32"
    >
      <BusinessSectionDecorations
        colors={BUSINESS_LANDING_DECORATION_COLORS.workspace}
        labels={BUSINESS_LANDING_DECORATION_LABELS.workspace}
        variant={1}
      />
      <div className="relative mx-auto max-w-7xl">
        <div
      aria-label="پێشبینینی ناوەڕۆکی گشتی"
          className="relative mx-auto flex h-[clamp(27rem,58svh,34rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-black/10 bg-[#f4f5f6] text-[#17191b] shadow-[0_34px_100px_-55px_rgba(15,23,42,.52)] dark:border-white/10 dark:bg-[#151719] dark:text-[#f4f5f6] dark:shadow-[0_38px_110px_-58px_rgba(0,0,0,.9)]"
        >
      <div
        role="tablist"
        aria-label="گەڕان بە ناو ناوەڕۆکەکاندا"
        className="flex h-14 shrink-0 items-stretch overflow-hidden border-b border-black/10 bg-transparent text-[#17191b] dark:border-white/10 dark:text-[#f4f5f6]"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              id={`business-workspace-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={isActive}
              aria-controls={`business-workspace-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setSelectedTab(tab.id)}
              onKeyDown={(event) => selectAdjacentTab(event, tab.id)}
              className="relative flex h-full min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden border-r border-black/10 px-4 text-xs font-medium text-black/65 transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/45 aria-selected:font-bold aria-selected:shadow-[inset_0_-2px_0_currentColor] dark:border-white/10 dark:text-white/65 dark:focus-visible:ring-white/60 sm:max-w-56 sm:flex-none sm:justify-start sm:px-5"
            >
              <FileText aria-hidden="true" className="relative z-10 h-3.5 w-3.5 shrink-0" />
              <span className="relative z-10 truncate">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[13.5rem] shrink-0 flex-col border-r border-black/10 bg-transparent dark:border-white/10 sm:flex lg:w-60">
          <div className="flex h-12 items-center gap-2 border-b border-black/10 px-4 dark:border-white/10">
            <Image
              src="/images/Logo.jpg"
              alt="MultiTree"
              width={24}
              height={24}
              className="h-6 w-6 rounded-lg object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
              unoptimized
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">MultiTree AI</p>
              <p className="mt-0.5 text-[0.6rem] text-black/38 dark:text-white/35">
                وەڵامی خێرا
              </p>
            </div>
          </div>
          <div
            className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-live="polite"
          >
            {assistantMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-xl border border-black/10 bg-transparent px-3 py-2 text-[0.7rem] leading-5 dark:border-white/10 ${message.role === "visitor" ? "ml-auto text-black/75 dark:text-white/75" : "text-black/65 dark:text-white/65"}`}
                dir="auto"
              >
                {message.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={handleAssistantSubmit}
            className="border-t border-black/10 p-3 dark:border-white/10"
          >
            <label htmlFor="business-workspace-assistant" className="sr-only">
              نامە بۆ MultiTree Agent
            </label>
            <div className="flex items-end gap-2 rounded-xl border border-black/10 bg-transparent p-1.5 dark:border-white/10">
              <input
                id="business-workspace-assistant"
                value={assistantInput}
                onChange={(event) => setAssistantInput(event.target.value)}
                maxLength={160}
                placeholder="نامەیەک بنووسە..."
                className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-[0.7rem] text-black/75 outline-none placeholder:text-black/30 dark:text-white/75 dark:placeholder:text-white/28"
                dir="auto"
              />
              <button
                type="submit"
                disabled={!assistantInput.trim()}
                aria-label="ناردنی نامە"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#17191b] text-white transition-opacity disabled:opacity-35 dark:bg-white dark:text-[#111315]"
              >
                <SendHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-transparent">
          <div className="flex h-12 shrink-0 items-center gap-4 border-b border-black/10 px-3 text-[0.7rem] text-black/45 dark:border-white/10 dark:text-white/40 sm:px-4">
            <span className="flex items-center gap-1.5">
              <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" />
              ناوەڕۆک
            </span>
            <span className="flex h-full items-center border-b-2 border-[#17191b] font-semibold text-black/80 dark:border-white dark:text-white/85">
              بڵاوکراوە
            </span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-2.5 sm:p-3.5">
        {activeTab === "linktrees" && (
          <div
            className="relative h-full"
            id="business-workspace-panel-linktrees"
            role="tabpanel"
            aria-labelledby="business-workspace-tab-linktrees"
          >
            <div className="hidden">
              <h2 className="text-sm font-semibold leading-6 text-gray-500 dark:text-white/40">
                لینکترییە بڵاوکراوەکان
              </h2>
              <span className="text-xs tabular-nums text-gray-500 dark:text-white/40">
                {linktrees.length}
              </span>
            </div>
            <div className="grid min-h-full min-w-0 grid-flow-row-dense auto-rows-[6.5rem] grid-cols-2 gap-2.5 sm:auto-rows-[7.5rem] lg:auto-rows-[8.25rem] lg:grid-cols-3 lg:gap-3">
              {linktrees.map((item, index) => (
                <PublicContentCard
                  key={item.id}
                  href={`/linktree/${item.seo_name || item.uid}`}
                  name={item.name}
                  description={item.subtitle}
                  image={item.image}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}

          </div>
        </div>
      </div>
        </div>
      </div>
    </section>
  );
}


function normalizePhone(value?: string | null) {
  const display = value?.trim() || "";
  const tel = display.replace(/[^+\d]/g, "");
  const whatsapp = display.replace(/\D/g, "");
  return {
    display,
    telHref: tel.length >= 5 ? `tel:${tel}` : null,
    whatsappHref:
      whatsapp.length >= 8 ? `https://wa.me/${whatsapp}` : null,
  };
}

export function BusinessLanding({
  business,
  linktrees,
}: {
  business: BusinessData;
  linktrees: LinktreeItem[];
}) {
  const accentColor = parseWebsiteColor(
    business.website_color || MULTITREE_ACCENT_COLOR,
  ).primary;
  const phone = useMemo(
    () => normalizePhone(business.footer_phone),
    [business.footer_phone],
  );

  return (
    <BusinessPublicSiteShell
      id={BUSINESS_LANDING_SECTION_IDS.home}
      businessName={business.name}
      logo={
        business.logo || business.default_avatar || "/images/DefaultAvatar.png"
      }
      accentColor={accentColor}
      homeHref={BUSINESS_LANDING_SECTION_HREFS.home}
      navigationItems={[
        { label: "پەڕەکان", href: BUSINESS_LANDING_SECTION_HREFS.workspace },
        { label: "دەربارەی ئێمە", href: BUSINESS_LANDING_SECTION_HREFS.about },
        {
          label: "خزمەتگوزارییەکان",
          href: BUSINESS_LANDING_SECTION_HREFS.digitalPresence,
        },
        {
          label: "دیزاینەکان",
          href: BUSINESS_LANDING_SECTION_HREFS.mobileShowcase,
        },
        // Only offered when the business actually has a live advertising
        // page; on lower plans the route 404s.
        ...(business.advertising_enabled
          ? [{ label: "ڕیکلام", href: "/advertising" }]
          : []),
      ]}
      action={
        business.whatsapp_enabled && phone.whatsappHref
          ? {
              label: "پەیوەندی",
              href: phone.whatsappHref,
              external: true,
            }
          : null
      }
      footer={{
        logo: business.logo || business.default_avatar,
        description:
          business.footer_text?.trim() ||
          `${business.name}'s official public website.`,
        phone: business.footer_phone,
        whatsappEnabled: business.whatsapp_enabled,
        advertisingEnabled: Boolean(business.advertising_enabled),
        brandingRemoved: Boolean(business.branding_removed),
        linktrees: linktrees.map((item) => ({
          name: item.name,
          href: `/linktree/${item.seo_name || item.uid}`,
        })),
      }}
    >
        <div className="relative isolate overflow-hidden">
          <BusinessHero
            accentColor={accentColor}
          />

          <BusinessWorkspaceSection linktrees={linktrees} />

          <div className="relative px-5 sm:px-8">
            <BusinessTrustedBy partners={business.trusted_partners || []} />
          </div>

        </div>

        <BusinessAbout accentColor={accentColor} />

        <BusinessDigitalPresenceShowcase
          accentColor={accentColor}
          businessName={business.name}
        />

        <BusinessMobileShowcase
          businessName={business.name}
          businessLogo={business.logo || business.default_avatar}
          phoneNumber={business.footer_phone}
          accentColor={accentColor}
        />
    </BusinessPublicSiteShell>
  );
}
