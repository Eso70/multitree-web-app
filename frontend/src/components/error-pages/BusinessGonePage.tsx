import { ErrorPage } from "./ErrorPage";
import { businessErrorTheme } from "./error-theme";
import { ERROR_PAGE_COPY } from "./copy";
import { fetchBusinessSubdomainThemeFromHeaders } from "@/lib/utils/business-error-theme.server";

export async function BusinessGonePage() {
  const theme = await fetchBusinessSubdomainThemeFromHeaders();

  return (
    <ErrorPage
      {...ERROR_PAGE_COPY.gone}
      theme={businessErrorTheme(theme)}
      homeHref="/"
    />
  );
}
