import { ErrorPage } from "./ErrorPage";
import { businessErrorTheme } from "./error-theme";
import { ERROR_PAGE_COPY } from "./copy";
import {
  fetchAuthenticatedBusinessTheme,
  fetchBusinessSubdomainThemeFromHeaders,
} from "@/lib/utils/business-error-theme.server";

interface BusinessBadGatewayPageProps {
  authenticated?: boolean;
}

export async function BusinessBadGatewayPage({
  authenticated = false,
}: BusinessBadGatewayPageProps) {
  const theme = authenticated
    ? await fetchAuthenticatedBusinessTheme()
    : await fetchBusinessSubdomainThemeFromHeaders();

  return (
    <ErrorPage
      {...ERROR_PAGE_COPY.badGateway}
      theme={businessErrorTheme(theme)}
      homeHref="/"
      showRetry
    />
  );
}
