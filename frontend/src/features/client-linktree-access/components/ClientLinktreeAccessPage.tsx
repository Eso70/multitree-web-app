"use client";

import { useCallback, useEffect, useState } from "react";
import { ReusableLinktreeEditorModal } from "@/features/link-editor/components/ReusableLinktreeEditorModal";
import type { LinktreeEditorSubmitData } from "@/features/link-editor/editor-types";
import { apiRequest, isApiRequestError } from "@/lib/api/request";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { isTemplateKey } from "@/lib/templates/config";
import {
  applyBusinessTabBranding,
  loadBusinessSubdomainTheme,
  type BusinessSubdomainTheme,
} from "@/lib/utils/business-error-theme";
import type { ClientAccessContext, ClientLinktreeAnalytics } from "../types";
import { ClientInvitationAuthentication } from "./ClientInvitationAuthentication";
import { ClientInvitationSkeleton } from "./ClientInvitationSkeleton";
import { ClientLinktreeDashboard } from "./ClientLinktreeDashboard";

function submitPayload(data: LinktreeEditorSubmitData) {
  return {
    name: data.name.trim(),
    ...(data.subtitle?.trim() ? { subtitle: data.subtitle.trim() } : {}),
    ...(data.description?.trim()
      ? { description: data.description.trim() }
      : {}),
    slug: data.slug.trim(),
    image: data.image,
    background_color: data.background_color,
    template_config: data.templateConfig,
    ...(data.footer_text?.trim()
      ? { footer_text: data.footer_text.trim() }
      : {}),
    ...(data.footer_phone?.trim()
      ? { footer_phone: data.footer_phone.trim() }
      : {}),
    footer_hidden: data.footer_hidden ?? false,
    platforms: data.platforms,
    links: data.links,
    linkMetadata: data.linkMetadata,
  };
}

function ClientLinktreeAccessContent({
  theme,
}: {
  theme: BusinessSubdomainTheme | null;
}) {
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [context, setContext] = useState<ClientAccessContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [analytics, setAnalytics] = useState<ClientLinktreeAnalytics | null>(
    null,
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const linktreeId = context?.linktree?.id;

  const loadSession = useCallback(async () => {
    try {
      const next = await apiRequest<ClientAccessContext>(
        "/api/client-linktree-access/session",
      );
      setContext(next);
      setUnavailable(false);
      return next;
    } catch (error) {
      if (!isApiRequestError(error, 401)) console.error(error);
      setContext(null);
      return null;
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      setAnalytics(
        await apiRequest<ClientLinktreeAnalytics>(
          "/api/client-linktree-access/analytics",
        ),
      );
    } catch (error) {
      if (isApiRequestError(error, 401)) {
        setContext(null);
        setUnavailable(true);
      } else {
        console.error(error);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const rawHash = window.location.hash.slice(1);
      const token = /^[A-Za-z0-9_-]{40,100}$/.test(rawHash) ? rawHash : null;
      setInvitationToken(token);
      if (rawHash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
      }
      void loadSession().then((session) => {
        if (!session && !token) setUnavailable(true);
        setLoading(false);
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSession]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (linktreeId) void loadAnalytics();
      else setAnalytics(null);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [linktreeId, loadAnalytics]);

  useEffect(() => {
    if (!context) return;
    const verifyAccess = () => {
      void loadSession().then((session) => {
        if (!session) setUnavailable(true);
      });
    };
    const intervalId = window.setInterval(verifyAccess, 60_000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") verifyAccess();
    };
    window.addEventListener("focus", verifyAccess);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", verifyAccess);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [context, loadSession]);

  if (loading) return <ClientInvitationSkeleton />;

  if (!context) {
    return (
      <ClientInvitationAuthentication
        theme={theme}
        unavailable={unavailable || !invitationToken}
        onUnlock={async (pin) => {
          if (!invitationToken) return "بانگهێشتنامەکە بەردەست نییە.";
          try {
            await apiRequest("/api/client-linktree-access/exchange", {
              method: "POST",
              json: { token: invitationToken, pin },
            });
            setInvitationToken(null);
            if (!(await loadSession())) {
              return "دانیشتنەکە نەکرایەوە. دوبارە هەوڵ بدەوە.";
            }
            return null;
          } catch (error) {
            if (isApiRequestError(error, 429)) {
              return "هەوڵی زۆر دراوە. دوای ماوەیەک دوبارە هەوڵ بدەوە.";
            }
            return "بەستەر یان پینەکە نادروستە.";
          }
        }}
      />
    );
  }

  const allowedTemplateKeys = context.templateKeys.filter(isTemplateKey);

  return (
    <>
      <ClientLinktreeDashboard
        context={context}
        theme={theme}
        analytics={analytics}
        analyticsLoading={analyticsLoading}
        onCreate={() => setEditorOpen(true)}
        onRefreshAnalytics={() => void loadAnalytics()}
        onLogout={() => {
          void apiRequest("/api/client-linktree-access/logout", {
            method: "POST",
          }).finally(() => {
            setContext(null);
            setUnavailable(true);
          });
        }}
      />
      {!context.linktree && allowedTemplateKeys.length > 0 ? (
        <ReusableLinktreeEditorModal
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          apiEndpoints={{
            upload: "/api/client-linktree-access/upload",
            checkSlug: "/api/client-linktree-access/check-slug",
            checkName: "/api/client-linktree-access/check-name",
          }}
          onSubmit={async (data) => {
            await apiRequest("/api/client-linktree-access/submit", {
              method: "POST",
              json: submitPayload(data),
            });
            await loadSession();
            setEditorOpen(false);
          }}
          businessDefaults={{
            default_footer_text: "MultiTree",
            default_footer_hidden: true,
            default_whatsapp_enabled: true,
          }}
          workflow={{
            persistence: "api",
            allowedTemplateKeys,
            allowImageUploads: true,
            maxImageBytes: 5 * 1024 * 1024,
            hideBusinessFields: true,
            hideFooterSection: true,
            hideWhatsappQuestions: false,
            title: "لینکترییەکەت دروست بکە",
            submitLabel: "دروستکردنی پەڕە",
          }}
        />
      ) : null}
    </>
  );
}

export default function ClientLinktreeAccessPage() {
  const [theme, setTheme] = useState<BusinessSubdomainTheme | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    void loadBusinessSubdomainTheme().then((loadedTheme) => {
      setTheme(loadedTheme);
      applyBusinessTabBranding(loadedTheme.favicon, loadedTheme.name);
      setThemeLoaded(true);
    });
  }, []);

  if (!themeLoaded) return <ClientInvitationSkeleton />;

  return (
    <ThemeProvider
      websiteColor={theme?.websiteColor.raw ?? null}
      documentTheme="business"
    >
      <ClientLinktreeAccessContent theme={theme} />
    </ThemeProvider>
  );
}
