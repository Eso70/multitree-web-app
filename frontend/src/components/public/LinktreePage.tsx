"use client";

import { memo, useCallback, useMemo, useEffect, useRef, useState } from "react";
import type {
  LinktreePresentation as Linktree,
  LinktreePresentationLink as Link,
  PublicPageAnalytics,
} from "@linktree/types";
import { appendMessageToUrl } from "@/lib/utils/message-url";
import { DynamicTemplate } from "@/components/templates/DynamicTemplate";
import { TikTokPixel } from "@/components/analytics/TikTokPixel";
import type { TemplateTheme } from "@/components/templates";
import {
  deriveAccentColor,
  deriveBorderColor,
  deriveTextColor,
  deriveTextSecondaryColor,
  deriveHighlightColor,
} from "@/lib/utils/theme-colors";
import { getBackgroundGradient, DEFAULT_BACKGROUND_COLOR } from "@/lib/config/background-gradients";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { applyCursorColor, resetCursorColor } from "@/lib/utils/cursor-theme";
import { WhatsAppQuestionModal, type WhatsAppQuestion } from "@/components/public/WhatsAppQuestionModal";
import {
  createPageTracker,
  type PageEventName,
} from "@/features/analytics/page-tracking";

/**
 * The action key the database registers for a link.
 *
 * Written once here and once in `fn_sync_linktree_public_page` in
 * `full_schema.sql`, which is the only pair that has to agree. Everything
 * downstream — the event name, the action id — is read from the row that
 * trigger wrote, so nothing else can drift.
 */
function linkActionKey(linkId: string): string {
  return `link:${linkId}`;
}

/**
 * The internal event a link click records, which is not the TikTok event.
 *
 * These two answer different questions and must not be conflated. This one
 * feeds the business's own breakdown — how many calls, how many WhatsApp
 * messages — and the TikTok name comes from the action row. A WhatsApp tap is
 * `whatsapp_click` here and `Contact` there, and both are correct.
 */
function clickEventName(platform: string): PageEventName {
  switch (platform.trim().toLowerCase()) {
    case "whatsapp":
    case "telegram":
    case "viber":
      return "whatsapp_click";
    case "phone":
    case "tel":
      return "call_click";
    case "email":
    case "mailto":
      return "email_click";
    case "facebook":
    case "instagram":
    case "tiktok":
    case "youtube":
    case "snapchat":
    case "x":
    case "linkedin":
      return "social_click";
    default:
      return "button_click";
  }
}

interface LinktreePageProps {
  linktree: Linktree;
  links: Link[];
  analytics: PublicPageAnalytics;
}

export const LinktreePage = memo(function LinktreePage({ linktree: rawLinktree, links, analytics }: LinktreePageProps) {
  // Identifies the page to the pixel across a soft navigation. Next.js keeps
  // this component mounted when moving between two linktrees, so without a key
  // that changes the second page would never report a view. The record's own
  // id rather than the pathname: it changes for exactly the same reason and is
  // already to hand here.
  const pixelPageKey = String(rawLinktree.id || rawLinktree.uid || "");

  // Override linktree configurations with business custom branding if set
  const linktree = useMemo(() => {
    return {
      ...rawLinktree,
      image: rawLinktree.image || rawLinktree.business_default_avatar || rawLinktree.business_logo || "/images/DefaultAvatar.png",
      background_color: rawLinktree.background_color,
    };
  }, [rawLinktree]);

  // Apply favicon overrides if set by business branding
  useEffect(() => {
    if (typeof window === "undefined") return;
    const businessFavicon = rawLinktree.business_favicon;
    if (!businessFavicon) return;

    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const originalHref = link.href;
    link.href = businessFavicon;

    return () => {
      if (link && originalHref) {
        link.href = originalHref;
      }
    };
  }, [rawLinktree]);

  // One tracker for the page. Rebuilt only when the page or its registered
  // actions change; a fresh instance would reset the repeat window and let a
  // double tap report twice.
  const tracker = useMemo(
    () =>
      createPageTracker({
        pageId: rawLinktree.id,
        pageName: rawLinktree.name,
        contentType: "linktree",
        analytics,
        description: rawLinktree.description || rawLinktree.subtitle || undefined,
      }),
    [analytics, rawLinktree.id, rawLinktree.name, rawLinktree.description, rawLinktree.subtitle],
  );

  // WhatsApp modal state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState<string>("");
  // Holds the in-flight WhatsApp click so it is counted once the visitor
  // actually proceeds to message, not merely when the modal opens.
  const pendingWhatsAppRef = useRef<{
    url: string;
    linkId: string;
    platform: string;
  } | null>(null);
  
  // Fix viewport height on iOS - must be client-side
  // This ensures proper height calculation on iPhone Safari
  // Performance: Debounced resize handler
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let timeoutId: NodeJS.Timeout;
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    
    // Set on load
    setVH();
    
    // Debounced resize handler for better performance
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(setVH, 150); // Debounce 150ms
    };
    
    // Update on resize and orientation change
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", setVH, { passive: true });
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  // Remove dark mode class from html on public page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
    }
    return () => {
      if (isDark) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  // The tracker refuses a second view for the same instance, so this is safe
  // under React's development double-invoke as well as a re-render.
  useEffect(() => {
    tracker.trackView();
  }, [tracker]);
  // Get background gradient or solid color based on background_color
  const baseTheme = useMemo(() => {
    const bgColor = linktree.background_color || DEFAULT_BACKGROUND_COLOR;
    return getBackgroundGradient(bgColor);
  }, [linktree.background_color]);

  // Extend theme with derived accent colors
  const theme: TemplateTheme = useMemo(() => {
    return {
      ...baseTheme,
      accent: deriveAccentColor(baseTheme.from, baseTheme.via, baseTheme.to),
      border: deriveBorderColor(baseTheme.from, baseTheme.via, baseTheme.to, 0.3),
      text: deriveTextColor(baseTheme.from, baseTheme.via, baseTheme.to),
      textSecondary: deriveTextSecondaryColor(baseTheme.from, baseTheme.via, baseTheme.to),
      highlight: deriveHighlightColor(baseTheme.from, baseTheme.via, baseTheme.to),
    };
  }, [baseTheme]);

  const businessWebsiteColor = useMemo(() => {
    return parseWebsiteColor(linktree.business_website_color || null);
  }, [linktree.business_website_color]);

  const backgroundStyle = useMemo(() => {
    const rawBackgroundColor = linktree.background_color || "";
    const gradientMatch = rawBackgroundColor.match(/^gradient:([\w-]+):(#[0-9a-fA-F]{3,6}):(#[0-9a-fA-F]{3,6})$/);
    if (gradientMatch) {
      const [, direction, from, to] = gradientMatch;
      const cssDirectionMap: Record<string, string> = {
        "to-r": "to right",
        "to-l": "to left",
        "to-b": "to bottom",
        "to-t": "to top",
        "to-br": "to bottom right",
        "to-bl": "to bottom left",
        "to-tr": "to top right",
        "to-tl": "to top left",
      };
      return direction === "radial"
        ? `radial-gradient(circle, ${from}, ${to})`
        : `linear-gradient(${cssDirectionMap[direction] ?? "to bottom right"}, ${from}, ${to})`;
    }
    if (theme.isSolid) {
      return theme.from;
    }
    return `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})`;
  }, [linktree.background_color, theme.from, theme.via, theme.to, theme.isSolid]);

  // Apply background color to body/page (client-side only to prevent hydration mismatch)
  // Optimized: Combined DOM updates and reduced re-renders
  useEffect(() => {
    // Only run on client to prevent hydration mismatch
    if (typeof window === 'undefined') return;
    let cancelled = false;
    void applyCursorColor(
      businessWebsiteColor.primary,
      document.documentElement,
      () => !cancelled,
    ).catch(() => undefined);
    
    // Batch DOM updates using requestAnimationFrame for better performance
    const rafId = requestAnimationFrame(() => {
      // Find the main background container using data attribute
      const bodyContainer = document.querySelector('body > div[data-theme-background]') as HTMLElement;
      
      if (bodyContainer) {
        // Apply the background (gradient or solid)
        bodyContainer.style.background = backgroundStyle;
        // Safari/iOS: Use 'scroll' instead of 'fixed' for better performance
        bodyContainer.style.backgroundAttachment = 'scroll';
      }
      
      // Update CSS variables in one batch
      const root = document.documentElement;
      root.style.setProperty('--theme-bg-from', theme.from);
      root.style.setProperty('--theme-bg-via', theme.isSolid ? theme.from : theme.via);
      root.style.setProperty('--theme-bg-to', theme.isSolid ? theme.from : theme.to);
      root.style.setProperty('--business-website-color', businessWebsiteColor.primary);
      root.style.setProperty('--business-website-css', businessWebsiteColor.css);

      // Dispatch theme change event (debounced to prevent excessive events)
      window.dispatchEvent(
        new CustomEvent('theme-background-change', {
          detail: {
            from: theme.from,
            via: theme.isSolid ? theme.from : theme.via,
            to: theme.isSolid ? theme.from : theme.to,
          },
        })
      );
    });
    
    // Cleanup: restore default on unmount
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (typeof window === 'undefined') return;
      const container = document.querySelector('body > div[data-theme-background]') as HTMLElement;
      if (container) {
        container.style.background = '';
        container.style.backgroundAttachment = 'scroll';
      }
      document.documentElement.style.removeProperty('--business-website-color');
      document.documentElement.style.removeProperty('--business-website-css');
      resetCursorColor();
    };
  }, [backgroundStyle, theme.from, theme.via, theme.to, theme.isSolid, businessWebsiteColor.primary, businessWebsiteColor.css]);

  // Extract WhatsApp modal config from template_config - completely dynamic
  const whatsappModalConfig = useMemo(() => {
    if (!linktree.template_config || typeof linktree.template_config !== 'object') {
      return null;
    }
    
    const config = linktree.template_config as Record<string, unknown>;
    const modalConfig = config.whatsapp_modal;
    
    if (!modalConfig || typeof modalConfig !== 'object' || Array.isArray(modalConfig)) {
      return null;
    }
    
    const modal = modalConfig as Record<string, unknown>;
    
    // Check if modal is enabled - default to false when not set
    const enabled = typeof modal.enabled === 'boolean' ? modal.enabled : false;
    if (!enabled) {
      return null;
    }
    
    // Extract questions array - completely dynamic, any IDs allowed
    let questions: WhatsAppQuestion[] | undefined;
    if (Array.isArray(modal.questions)) {
      questions = modal.questions
        .filter((q): q is WhatsAppQuestion => {
          if (!q || typeof q !== 'object') return false;
          const obj = q as unknown as Record<string, unknown>;
          return (
            typeof obj.id === 'string' &&
            typeof obj.text === 'string' &&
            typeof obj.message === 'string'
          );
        })
        .map((q) => {
          const obj = q as unknown as Record<string, unknown>;
          return {
            id: obj.id as string,
            text: obj.text as string,
            message: obj.message as string,
          };
        });
    }
    
    return {
      title: typeof modal.title === 'string' ? modal.title : undefined,
      subtitle: typeof modal.subtitle === 'string' ? modal.subtitle : undefined,
      questions: questions && questions.length > 0 ? questions : undefined,
    };
  }, [linktree.template_config]);

  /**
   * Cross-platform URL opener.
   * - Native URI schemes (tel:, viber://, mailto:) MUST use window.location.href on iOS Safari.
   *   window.open() is blocked for these schemes on iOS and will silently fail.
   * - Regular https:// links open in a new tab via window.open().
   */
  const openUrl = useCallback((targetUrl: string) => {
    // Native app URI schemes — must use location.href, NOT window.open()
    const isNativeScheme =
      targetUrl.startsWith("tel:") ||
      targetUrl.startsWith("viber://") ||
      targetUrl.startsWith("mailto:");

    if (isNativeScheme) {
      window.location.href = targetUrl;
      return;
    }

    // Regular web URLs — open in new tab
    try {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Fallback for popup blockers
      window.location.href = targetUrl;
    }
  }, []);

  /**
   * Reports one link click.
   *
   * Every link on the page has a registered action — `fn_sync_linktree_public_page`
   * writes one per link — so the tracker resolves the id and the TikTok event
   * name from the row rather than classifying the platform here. That mapping
   * used to live in TypeScript as well as in the trigger, and two copies of a
   * rule the deduplication depends on is one copy too many.
   */
  const reportLinkClick = useCallback(
    (linkId: string, platform: string, destination: string) => {
      const link = links.find((item) => item.id === linkId);
      tracker.trackAction(
        linkActionKey(linkId),
        clickEventName(platform),
        {
          label: link?.display_name || link?.platform || platform,
          destination,
          properties: { platform },
        },
      );
    },
    [links, tracker],
  );

  const handleLinkClick = useCallback((linkId: string, url: string, platform: string, defaultMessage?: string | null) => {
    if (platform === "whatsapp" && whatsappModalConfig?.questions?.length) {
      // The click is not an intent to message yet — the visitor still has to
      // pick a question — so it is held until they do.
      pendingWhatsAppRef.current = { url, linkId, platform };
      setPendingWhatsAppUrl(url);
      setIsWhatsAppModalOpen(true);
      return;
    }

    const finalUrl = appendMessageToUrl(url, platform, defaultMessage);
    reportLinkClick(linkId, platform, finalUrl);
    openUrl(finalUrl);
  }, [whatsappModalConfig, openUrl, reportLinkClick]);

  // Handle WhatsApp question selection
  const handleWhatsAppQuestionSelect = useCallback((message: string) => {
    const pending = pendingWhatsAppRef.current;
    if (!pending) return;

    const finalUrl = appendMessageToUrl(pending.url, "whatsapp", message);
    openUrl(finalUrl);
    reportLinkClick(pending.linkId, pending.platform, finalUrl);

    // Reset state
    pendingWhatsAppRef.current = null;
    setPendingWhatsAppUrl("");
  }, [openUrl, reportLinkClick]);

  return (
    <div className="relative">
      <TikTokPixel pixelIds={analytics.pixelIds} pageKey={pixelPageKey} />
      <div className="relative z-10">
        {/* Dynamic template renders based on template_config from database */}
        <DynamicTemplate
          linktree={linktree}
          links={links}
          theme={theme}
          onLinkClick={handleLinkClick}
        />
        
        {/* WhatsApp Question Modal */}
        <WhatsAppQuestionModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setPendingWhatsAppUrl("");
            pendingWhatsAppRef.current = null;
          }}
          onSelectQuestion={handleWhatsAppQuestionSelect}
          whatsappUrl={pendingWhatsAppUrl}
          title={whatsappModalConfig?.title}
          subtitle={whatsappModalConfig?.subtitle}
          questions={whatsappModalConfig?.questions}
        />
      </div>
    </div>
  );
});
