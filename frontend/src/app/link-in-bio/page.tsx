import type { Metadata } from "next";
import { ProductMarketingPage } from "@/features/public-site/ProductMarketingPage";

export const metadata: Metadata = {
  title: "Linktree | Sponsor.krd",
  description: "Link-in-bio پەڕەیەکی خێرا بۆ بەستەر و کمپەینەکانت دروست بکە",
};
export default function LinkInBioPage() {
  return <ProductMarketingPage />;
}
