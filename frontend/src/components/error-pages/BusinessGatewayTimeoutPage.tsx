import { ErrorPage } from "./ErrorPage";
import { businessErrorTheme } from "./error-theme";
import { ERROR_PAGE_COPY } from "./copy";
import {
  fetchAuthenticatedBusinessTheme,
  fetchBusinessSubdomainThemeFromHeaders,
} from "@/lib/utils/business-error-theme.server";

interface BusinessGatewayTimeoutPageProps {
  authenticated?: boolean;
}

export async function BusinessGatewayTimeoutPage({
  authenticated = false,
}: BusinessGatewayTimeoutPageProps) {
  const theme = authenticated
    ? await fetchAuthenticatedBusinessTheme()
    : await fetchBusinessSubdomainThemeFromHeaders();

  return (
    <ErrorPage
      {...ERROR_PAGE_COPY.gatewayTimeout}
      theme={businessErrorTheme(theme)}
      homeHref="/"
      showRetry
    />
  );
}
