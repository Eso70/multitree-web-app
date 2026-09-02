import { SkeletonAuthenticationPage } from "@/components/shared/SkeletonAuthenticationPage";
import { fetchBusinessSubdomainThemeFromHeaders } from "@/lib/utils/business-error-theme.server";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";

export default async function BusinessWorkspaceEntryLoading() {
  const theme = await fetchBusinessSubdomainThemeFromHeaders().catch(() => null);

  return (
    <SkeletonAuthenticationPage
      rememberDevice
      brandDescription="بڕۆ ژوورەوە بۆ بەڕێوەبردنی بزنس"
      brandName={theme?.name || "بزنس"}
      brandLogo={theme?.logo ?? BUSINESS_LOGO_PLACEHOLDER}
      accentColor={theme?.websiteColor?.raw}
      previewTitle="پانێڵی بزنس"
      businessTenant
    />
  );
}
