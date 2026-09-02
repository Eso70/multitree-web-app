import { SkeletonAuthenticationPage } from "@/components/shared/SkeletonAuthenticationPage";
import { fetchBusinessSubdomainThemeFromHeaders } from "@/lib/utils/business-error-theme.server";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";

export default async function BusinessAuthConsumeLoading() {
  const theme = await fetchBusinessSubdomainThemeFromHeaders().catch(() => null);

  return (
    <SkeletonAuthenticationPage
      content="operation"
      brandDescription="بە پاراستن دەچیتە داشبۆردی بزنسەکەت"
      brandName={theme?.name || "بزنس"}
      brandLogo={theme?.logo ?? BUSINESS_LOGO_PLACEHOLDER}
      accentColor={theme?.websiteColor?.raw}
      previewTitle="پانێڵی بزنس"
      businessTenant
    />
  );
}
