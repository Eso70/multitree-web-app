import { ErrorPage } from "./ErrorPage";
import { businessErrorTheme } from "./error-theme";
import { ERROR_PAGE_COPY } from "./copy";
import {
  fetchAuthenticatedBusinessTheme,
  fetchBusinessSubdomainThemeFromHeaders,
} from "@/lib/utils/business-error-theme.server";

interface BusinessServiceUnavailablePageProps {
  authenticated?: boolean;
}

export async function BusinessServiceUnavailablePage({
  authenticated = false,
}: BusinessServiceUnavailablePageProps) {
  const theme = authenticated
    ? await fetchAuthenticatedBusinessTheme()
    : await fetchBusinessSubdomainThemeFromHeaders();

  return (
    <ErrorPage
      {...ERROR_PAGE_COPY.serviceUnavailable}
      theme={businessErrorTheme(theme)}
      homeHref="/"
      showRetry
    />
  );
}
