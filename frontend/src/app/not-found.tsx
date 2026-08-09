import type { Metadata } from "next";
import { ErrorPage } from "@/components/error-pages/ErrorPage";
import {
  businessErrorTheme,
  MULTITREE_ERROR_THEME,
} from "@/components/error-pages/error-theme";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import {
  buildBusinessErrorMetadata,
  fetchBusinessSubdomainThemeFromHeaders,
  getBusinessSubdomainFromHeaders,
} from "@/lib/utils/business-error-theme.server";

export async function generateMetadata(): Promise<Metadata> {
  return buildBusinessErrorMetadata("Not Found");
}

export default async function NotFound() {
  const subdomain = await getBusinessSubdomainFromHeaders();
  const theme = subdomain
    ? businessErrorTheme(await fetchBusinessSubdomainThemeFromHeaders())
    : MULTITREE_ERROR_THEME;

  return <ErrorPage {...ERROR_PAGE_COPY.notFound} theme={theme} homeHref="/" />;
}
