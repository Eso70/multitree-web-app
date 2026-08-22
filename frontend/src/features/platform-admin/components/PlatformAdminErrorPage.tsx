"use client";

import { ErrorPage } from "@/components/error-pages/ErrorPage";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import { platformErrorTheme } from "@/components/error-pages/error-theme";

type PlatformAdminErrorKind =
  | "notFound"
  | "badGateway"
  | "serviceUnavailable"
  | "gatewayTimeout"
  | "forbidden";

interface PlatformAdminErrorPageProps {
  kind: PlatformAdminErrorKind;
  branding?: {
    name?: string | null;
    logo?: string | null;
    accentColor?: string;
    accentBackground?: string;
    accentInk?: string;
  };
  onReset?: () => void;
}

export function PlatformAdminErrorPage({
  kind,
  branding,
  onReset,
}: PlatformAdminErrorPageProps) {
  return (
    <ErrorPage
      {...ERROR_PAGE_COPY[kind]}
      theme={platformErrorTheme(branding)}
      homeHref="/"
      onReset={onReset}
    />
  );
}
