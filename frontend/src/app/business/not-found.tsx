import type { Metadata } from "next";
import { ErrorPage } from "@/components/error-pages/ErrorPage";
import { businessErrorTheme } from "@/components/error-pages/error-theme";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import {
  buildAuthenticatedBusinessErrorMetadata,
  fetchAuthenticatedBusinessTheme,
} from "@/lib/utils/business-error-theme.server";

export async function generateMetadata(): Promise<Metadata> {
  return buildAuthenticatedBusinessErrorMetadata("Not Found");
}

export default async function NotFound() {
  const theme = await fetchAuthenticatedBusinessTheme();
  return (
    <ErrorPage
      {...ERROR_PAGE_COPY.notFound}
      theme={businessErrorTheme(theme)}
      homeHref="/"
    />
  );
}
