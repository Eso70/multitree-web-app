"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe2,
  LayoutDashboard,
  Network,
  Palette,
  Sparkles,
} from "lucide-react";
import { PhoneMockup } from "@/components/shared/PhoneMockup";
import { PublicSiteNavbar } from "@/components/public/PublicSiteNavbar";
import { CustomScrollbar } from "./CustomScrollbar";
import { PlansSection } from "./PlansSection";
import {
  getMultiTreeAccentInk,
  MULTITREE_ACCENT_COLOR,
} from "@/lib/multitree-theme";
import { applyCursorColor, resetCursorColor } from "@/lib/utils/cursor-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { HomepageCommunications } from "@/features/communications/HomepageCommunications";
import { HomeFooter } from "./HomeFooter";

const PRIMARY = "var(--multitree-accent)";
const PRIMARY_DARK = "var(--multitree-accent-text)";
const PRIMARY_DARK_MODE = "var(--multitree-accent-text-dark)";
const accentSoft = (strength: number) =>
  `color-mix(in srgb, var(--multitree-accent) ${strength}%, transparent)`;

const tabs = [
  {
    id: "management",
    label: "Management",
    icon: LayoutDashboard,
    title: "Global Control Center",
    text: "Create businesses, manage every public page, control access, and keep your whole MultiTree network organized from one clean platform administrator dashboard.",
    bullets: [
      "Centralized business management",
      "Page export and import",
      "Secure account controls",
    ],
  },
  {
    id: "branding",
    label: "Branding",
    icon: Palette,
    title: "Your Brand, Uncompromised",
    text: "Give every business a distinct visual identity with its own logo, favicon, colors, default avatar, templates, and public-page styling.",
    bullets: [
      "Custom logos and colors",
      "Reusable page templates",
      "Business-specific defaults",
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    title: "Insightful Intelligence",
    text: "Understand real views, unique visitors, raw clicks, devices, platforms, and daily performance across every public link page.",
    bullets: [
      "Real-time activity tracking",
      "Daily performance history",
      "TikTok Pixel and Events API",
    ],
  },
];

function AnalyticsMockup() {
  return (
    <div
      data-cursor-interactive
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] p-5 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">
            PERFORMANCE
          </p>
          <h4 className="mt-1 font-bold text-gray-800 dark:text-white">
            Link activity
          </h4>
        </div>
        <span
          className="rounded-lg px-2 py-1 text-xs font-bold"
          style={{ backgroundColor: accentSoft(20), color: PRIMARY_DARK }}
        >
          Live
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#f3f4f5] dark:bg-[#0f172a] p-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Total views
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            24.8k
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: accentSoft(13) }}
        >
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Total clicks
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            12.4k
          </p>
        </div>
      </div>
      <div className="mt-4 flex h-32 items-end gap-2 rounded-xl bg-[#f8f9fa] dark:bg-[#0f172a] p-4">
        {[32, 48, 41, 66, 56, 82, 70, 94, 76, 88, 72, 98].map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              height: `${h}%`,
              backgroundColor: i > 8 ? PRIMARY : accentSoft(53),
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function HomeLanding() {
  const [activeId, setActiveId] = useState("management");
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/platform-theme", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (cancelled || typeof payload?.data?.accent_color !== "string")
          return;
        const accent = parseWebsiteColor(payload.data.accent_color);
        const root = document.documentElement;
        root.style.setProperty("--multitree-accent", accent.primary);
        root.style.setProperty("--multitree-accent-gradient", accent.css);
        root.style.setProperty(
          "--multitree-accent-ink",
          getMultiTreeAccentInk(accent.primary),
        );
        void applyCursorColor(accent.primary, root, () => !cancelled).catch(
          () => undefined,
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      const root = document.documentElement;
      root.style.setProperty("--multitree-accent", MULTITREE_ACCENT_COLOR);
      root.style.setProperty(
        "--multitree-accent-gradient",
        `linear-gradient(to right, ${MULTITREE_ACCENT_COLOR}, ${MULTITREE_ACCENT_COLOR})`,
      );
      root.style.setProperty(
        "--multitree-accent-ink",
        getMultiTreeAccentInk(MULTITREE_ACCENT_COLOR),
      );
      resetCursorColor(root);
    };
  }, []);

  return (
    <main
      dir="ltr"
      className="min-h-screen overflow-x-clip bg-[#f8f9fa] dark:bg-[#0f172a] text-[#111827] dark:text-slate-100 transition-colors duration-300"
    >
      <PublicSiteNavbar appearance="multitree" />
      <CustomScrollbar />
      <HomepageCommunications />

      <section className="relative overflow-hidden min-h-screen flex items-center pt-20 pb-20 lg:pt-0 lg:pb-0">
        <div
          className="absolute left-1/2 top-0 -z-0 h-full w-[120%] -translate-x-1/2"
          style={{
            background: `radial-gradient(circle at top, ${accentSoft(13)} 0%, transparent 60%)`,
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2 w-full">
          <div className="flex flex-col gap-4">
            <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-[-.04em] sm:text-5xl lg:text-6xl xl:text-7xl">
              Your Brand, Everywhere.
              <br />
              <span className="text-brand-700 dark:text-brand-300">
                All at once.
              </span>
            </h1>
            <p className="max-w-xl text-lg lg:text-xl leading-7 text-gray-600 dark:text-slate-400">
              Deploy professional, branded public link pages on dedicated
              subdomains. Manage every business from a single, beautiful
              dashboard designed for control and scale.
            </p>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <a
                href="#features"
                className="flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-lg font-bold shadow-lg transition hover:-translate-y-0.5 active:scale-95"
                style={{
                  backgroundColor: PRIMARY,
                  color: "var(--multitree-accent-ink)",
                }}
              >
                Explore the platform <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#solutions"
                className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] px-8 py-4 text-lg font-semibold text-gray-850 dark:text-white transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95"
              >
                View solutions
              </a>
            </div>
            <div className="flex items-center gap-5 pt-7">
              <div className="flex -space-x-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white dark:border-slate-900 bg-brand-100 dark:bg-brand-950 text-xs font-bold text-brand-800 dark:text-brand-300">
                  W
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white dark:border-slate-900 bg-gray-200 dark:bg-slate-750 text-xs font-bold text-gray-700 dark:text-slate-350">
                  B
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-white dark:border-slate-900 bg-brand-200 dark:bg-brand-900 text-xs font-bold text-brand-800 dark:text-brand-200">
                  S
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400">
                Built for{" "}
                <strong className="text-brand-700 dark:text-brand-300">
                  multiple brands
                </strong>{" "}
                and growing teams
              </p>
            </div>
          </div>

          <div className="relative flex h-[320px] xs:h-[390px] sm:h-[490px] md:h-[530px] lg:h-[680px] xl:h-[720px] w-full items-center justify-center px-2">
            {/* macOS Browser Mockup */}
            <div
              data-cursor-interactive
              className="relative z-10 aspect-[16/10] w-full max-w-[330px] xs:max-w-[400px] sm:max-w-[480px] md:max-w-[560px] lg:max-w-[660px] xl:max-w-[720px] -rotate-1 overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-155 dark:border-gray-800 bg-white dark:bg-[#1e293b] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.06)] sm:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.08)] transition-all duration-500 hover:scale-[1.01] hover:rotate-0"
            >
              {/* macOS Window Title Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-[#1e293b] border-b border-gray-100 dark:border-gray-800 px-3 sm:px-5 py-2 sm:py-3.5">
                {/* Traffic lights */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="h-1.5 w-1.5 sm:h-3 sm:w-3 rounded-full bg-[#ff5f56] opacity-80" />
                  <span className="h-1.5 w-1.5 sm:h-3 sm:w-3 rounded-full bg-[#ffbd2e] opacity-80" />
                  <span className="h-1.5 w-1.5 sm:h-3 sm:w-3 rounded-full bg-[#27c93f] opacity-80" />
                </div>
                {/* Safari URL bar */}
                <div className="flex-1 max-w-[180px] xs:max-w-[220px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[340px] mx-auto flex items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-gray-800 py-0.5 sm:py-1 text-[7px] xs:text-[8px] sm:text-[9px] md:text-[9.5px] lg:text-[10px] text-gray-500 dark:text-slate-400 font-medium shadow-inner">
                  <span className="text-emerald-500 text-[6px] sm:text-[8px]">
                    🔒
                  </span>
                  <span className="text-gray-400 select-none hidden xs:inline">
                    https://
                  </span>
                  <span className="text-gray-700 dark:text-slate-200">
                    Private administrator console
                  </span>
                </div>
                <div className="w-10 sm:w-14" />
              </div>

              {/* Window Content */}
              <div className="flex h-full min-h-[220px] sm:min-h-[340px]">
                {/* Sidebar */}
                <div className="w-[22%] sm:w-1/4 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] p-1.5 xs:p-2 sm:p-3 md:p-3.5 lg:p-4 flex flex-col gap-1 sm:gap-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Image
                      src="/images/Logo.jpg"
                      alt="MultiTree logo"
                      width={28}
                      height={28}
                      className="rounded-md object-cover h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 md:h-6.5 md:w-6.5 lg:h-7 lg:w-7 shadow-sm"
                    />
                    <span className="text-[6px] xs:text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs font-bold tracking-tight text-brand-700 dark:text-brand-300 hidden xs:inline leading-none">
                      MultiTree
                    </span>
                  </div>
                  <div className="mt-2 sm:mt-5 flex flex-col gap-1 sm:gap-1.5">
                    <div className="flex items-center gap-1 sm:gap-2.5 rounded-lg bg-brand-500/15 px-1 xs:px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-2 text-[5px] xs:text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-brand-800 dark:text-brand-300 shadow-sm">
                      <LayoutDashboard className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4" />
                      <span>Registry</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2.5 rounded-lg px-1 xs:px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-2 text-[5px] xs:text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white transition duration-200 cursor-pointer">
                      <Palette className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-gray-400" />
                      <span className="hidden xs:inline">Templates</span>
                      <span className="xs:hidden">Themes</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2.5 rounded-lg px-1 xs:px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-2 text-[5px] xs:text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white transition duration-200 cursor-pointer">
                      <BarChart3 className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 text-gray-400" />
                      <span className="hidden xs:inline">Analytics</span>
                      <span className="xs:hidden">Stats</span>
                    </div>
                  </div>
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 p-2 xs:p-2.5 sm:p-4 md:p-4.5 lg:p-5 flex flex-col gap-1.5 sm:gap-3.5 bg-gray-50/40 dark:bg-[#1e293b]/30 overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-[7px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-extrabold text-gray-800 dark:text-white tracking-tight">
                        Businesses Registry
                      </h4>
                      <p className="text-[5px] xs:text-[6px] sm:text-[7px] md:text-[7.5px] lg:text-[8px] text-gray-400 dark:text-slate-400 mt-0 sm:mt-0.5 font-medium">
                        Manage registered brands
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 px-1 xs:px-1.5 sm:px-2 py-0.5 text-[5px] xs:text-[6px] sm:text-[7px] md:text-[7.5px] lg:text-[8px] font-bold text-emerald-700 dark:text-emerald-400">
                      3 Active
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                    <div className="rounded-lg sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] p-1 xs:p-1.5 sm:p-2.5 md:p-3 shadow-sm hover:shadow transition duration-300">
                      <span className="text-[4px] xs:text-[5px] sm:text-[6px] md:text-[6.5px] lg:text-[7px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                        Views
                      </span>
                      <p className="text-[7px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-extrabold text-gray-800 dark:text-white mt-0 sm:mt-0.5">
                        18,490
                      </p>
                    </div>
                    <div className="rounded-lg sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] p-1 xs:p-1.5 sm:p-2.5 md:p-3 shadow-sm hover:shadow transition duration-300">
                      <span className="text-[4px] xs:text-[5px] sm:text-[6px] md:text-[6.5px] lg:text-[7px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                        Clicks
                      </span>
                      <p className="text-[7px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-xs font-extrabold text-gray-800 dark:text-white mt-0 sm:mt-0.5">
                        6,128
                      </p>
                    </div>
                  </div>

                  {/* Businesses list */}
                  <div className="flex flex-col gap-1 sm:gap-2 pt-0.5">
                    {[
                      {
                        name: "Kurdish Sponsor",
                        site: "kurdish.multitree.link",
                        views: "8.4k",
                        clicks: "3.1k",
                        initials: "KS",
                        color: PRIMARY_DARK,
                      },
                      {
                        name: "Zara Outlet",
                        site: "zara.multitree.link",
                        views: "5.1k",
                        clicks: "1.8k",
                        initials: "ZO",
                        color: "#111827",
                      },
                      {
                        name: "Fast Cafe",
                        site: "fast.multitree.link",
                        views: "4.9k",
                        clicks: "1.1k",
                        initials: "FC",
                        color: PRIMARY,
                      },
                    ].map((b) => (
                      <div
                        key={b.name}
                        className="flex items-center justify-between rounded-md xs:rounded-lg sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f172a] p-1 xs:p-1.5 sm:p-2.5 md:p-3 shadow-[0_1px_4px_rgba(0,0,0,0.01)] sm:shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer"
                      >
                        <div className="flex items-center gap-1 sm:gap-3">
                          <div
                            className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 rounded-md sm:rounded-xl flex items-center justify-center text-[4px] xs:text-[5px] sm:text-[6px] md:text-[7px] lg:text-[8px] font-bold text-white shadow-sm font-mono"
                            style={{ backgroundColor: b.color }}
                          >
                            {b.initials}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 dark:text-white leading-tight text-[6px] xs:text-[8px] sm:text-[8.5px] md:text-[9px] lg:text-[10px]">
                              {b.name}
                            </div>
                            <div className="text-gray-400 dark:text-slate-400 text-[4px] xs:text-[6px] sm:text-[7px] md:text-[7.5px] lg:text-[8px] mt-0 sm:mt-0.5 hidden xs:block">
                              {b.site}
                            </div>
                          </div>
                        </div>
                        <div className="text-right pr-0.5 sm:pr-1">
                          <div className="text-gray-800 dark:text-white leading-tight text-[6px] xs:text-[8px] sm:text-[8.5px] md:text-[9px] lg:text-[10px]">
                            {b.views}
                          </div>
                          <div className="text-gray-400 dark:text-slate-400 text-[4px] xs:text-[6px] sm:text-[7px] md:text-[7.5px] lg:text-[8px] mt-0.5">
                            {b.clicks} clicks
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <PhoneMockup
              ariaLabel="MultiTree Linktree mobile preview"
              name="Zara Outlet"
              screenClassName="bg-white dark:bg-[#0f172a]"
              statusBarClassName="text-gray-700 dark:text-slate-300"
              className="absolute bottom-[-15px] right-[-5px] z-20 w-[165px] rotate-[3deg] shadow-[0_15px_35px_rgba(0,0,0,.2)] xs:w-[180px] sm:bottom-[-20px] sm:right-2 sm:w-[195px] sm:shadow-[0_30px_70px_rgba(0,0,0,.25)] md:right-[5px] md:w-[205px] lg:right-[-25px] lg:w-[215px] xl:right-[-35px] xl:w-[225px]"
            >
              <div className="flex h-full flex-col justify-between bg-white px-7 pb-8 pt-20 dark:bg-[#0f172a]">
                <div>
                  <div className="text-center">
                    <Image
                      src="/images/Logo.jpg"
                      alt="Zara logo"
                      width={88}
                      height={88}
                      className="mx-auto h-[88px] w-[88px] rounded-full border border-gray-100 object-cover shadow dark:border-gray-700"
                    />
                    <h3 className="mt-3 text-lg font-bold text-gray-800 dark:text-white">
                      Zara Outlet
                    </h3>
                    <p className="mt-1 text-xs font-medium leading-5 text-gray-500 dark:text-slate-400">
                      بۆ بینینی کاڵاکانمان سەردانی لینکەکان بکە
                    </p>
                  </div>

                  <div className="mt-8 space-y-3">
                  {[
                    {
                      label: "WhatsApp",
                      color: "#25D366",
                      bg: "rgba(37,211,102,0.12)",
                      darkBg: "rgba(37,211,102,0.18)",
                      text: "#128C7E",
                      darkText: "#4ade80",
                    },
                    {
                      label: "Instagram",
                      color: "#E1306C",
                      bg: "rgba(225,48,108,0.1)",
                      darkBg: "rgba(225,48,108,0.15)",
                      text: "#C13584",
                      darkText: "#f472b6",
                    },
                    {
                      label: "Telegram",
                      color: "#0088cc",
                      bg: "rgba(0,136,204,0.1)",
                      darkBg: "rgba(0,136,204,0.15)",
                      text: "#0088cc",
                      darkText: "#38bdf8",
                    },
                    {
                      label: "Website",
                      color: PRIMARY,
                      bg: accentSoft(15),
                      darkBg: accentSoft(20),
                      text: PRIMARY_DARK,
                      darkText: PRIMARY_DARK_MODE,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="iphone-pill flex min-h-12 items-center justify-center rounded-full border px-5 text-sm font-bold shadow-sm"
                      style={
                        {
                          borderColor: `${item.color}35`,
                          backgroundColor: item.bg,
                          color: item.text,
                          // CSS custom properties for dark mode override
                          "--pill-dark-bg": item.darkBg,
                          "--pill-dark-text": item.darkText,
                        } as React.CSSProperties
                      }
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                    </div>
                  ))}
                  </div>
                </div>

                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                  Powered by MultiTree
                </div>
              </div>
            </PhoneMockup>

            <div className="absolute -right-3 top-24 z-30 hidden rounded-xl bg-white dark:bg-[#1e293b] border dark:border-gray-800 p-3 shadow-lg sm:block">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-8 w-8 place-items-center rounded-lg"
                  style={{ backgroundColor: accentSoft(20) }}
                >
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] uppercase text-gray-400 dark:text-slate-400">
                    Status
                  </p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">
                    Live & branded
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-16 bg-white dark:bg-[#0f172a] py-20 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-12 flex max-w-2xl flex-col gap-4 text-center">
            <h2 className="text-3xl font-semibold tracking-[-.02em] text-[#111827] dark:text-white">
              Master Your Portfolio
            </h2>
            <p className="text-gray-600 dark:text-slate-400">
              Everything you need to build, manage, and analyze branded link
              experiences at scale.
            </p>
          </div>
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = tab.id === active.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveId(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-5 py-3 font-medium shadow-sm transition cursor-pointer ${selected ? "" : "bg-white dark:bg-[#1e293b] text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-800/80"}`}
                  style={
                    selected
                      ? {
                          backgroundColor: PRIMARY,
                          color: "var(--multitree-accent-ink)",
                        }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 items-center gap-8 rounded-3xl bg-[#f3f4f5] dark:bg-[#1e293b]/40 border dark:border-gray-800 p-5 sm:p-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-2 sm:p-4">
              <h3
                className="text-2xl font-semibold"
                style={{ color: PRIMARY_DARK }}
              >
                {active.title}
              </h3>
              <p className="text-lg leading-7 text-gray-600 dark:text-slate-300">
                {active.text}
              </p>
              <ul className="space-y-3 pt-4">
                {active.bullets.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-gray-650 dark:text-slate-300"
                  >
                    <Check
                      className="h-5 w-5"
                      style={{ color: PRIMARY_DARK }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-[#eaebec] dark:bg-[#0f172a] p-4 shadow-inner max-w-[480px] mx-auto w-full">
              <AnalyticsMockup />
            </div>
          </div>
        </div>
      </section>

      <section
        id="solutions"
        className="scroll-mt-16 py-20 bg-[#f8f9fa] dark:bg-[#0f172a] transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Globe2,
                title: "Wildcard Subdomains",
                body: "Give every business a dedicated address and publish its public pages instantly under your platform domain.",
              },
              {
                icon: Network,
                title: "Multi-tenant Power",
                body: "Keep accounts, pages, sessions, uploads, and settings properly separated while managing everything centrally.",
              },
              {
                icon: BarChart3,
                title: "Deep Analytics",
                body: "Track real visits, unique viewers, clicks, platforms, devices, and TikTok conversion events with precision.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="group rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e293b] p-8 shadow-sm transition hover:shadow-md"
              >
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-110"
                  style={{
                    backgroundColor: accentSoft(15),
                    color: PRIMARY_DARK,
                  }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-4 text-2xl font-semibold text-[#111827] dark:text-white">
                  {title}
                </h3>
                <p className="leading-relaxed text-gray-600 dark:text-slate-400">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PlansSection />

      <section className="px-6 py-20 bg-white dark:bg-[#0f172a] transition-colors duration-300">
        <div
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[3rem] px-8 py-16 text-center sm:px-16 sm:py-20"
          style={{
            backgroundColor: PRIMARY,
            color: "var(--multitree-accent-ink)",
          }}
        >
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-[70px]" />
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/20 blur-[70px]" />
          <h2 className="relative z-10 text-4xl font-bold tracking-[-.04em] sm:text-5xl">
            One platform for
            <br className="hidden sm:block" /> every brand connection.
          </h2>
          <p className="relative z-10 mx-auto mb-10 mt-6 max-w-xl text-lg opacity-75">
            Bring businesses, branded pages, analytics, and link management
            together in one purposeful platform.
          </p>
          <a
            href="#features"
            className="relative z-10 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-[#0f172a] px-10 py-5 text-lg font-bold text-slate-900 dark:text-white shadow-2xl transition active:scale-95"
          >
            Explore the features <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}
