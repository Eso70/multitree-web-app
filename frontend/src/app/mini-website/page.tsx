import type { Metadata } from "next";
import { ProductMarketingPage } from "@/features/public-site/ProductMarketingPage";

export const metadata: Metadata = {
  title: "مینی وێبسایت | MultiTree",
  description: "Mini Website ـێکی پیشەیی بۆ ناساندنی خۆت یان بزنسەکەت دروست بکە",
};
export default function MiniWebsiteMarketingPage() {
  return <ProductMarketingPage product="mini-website" />;
}
