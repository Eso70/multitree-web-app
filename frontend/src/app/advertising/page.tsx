import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicAdvertisingService } from "@/features/advertising/components/PublicAdvertisingService";
import {
  advertisingPublicProps,
  loadAdvertisingPublicData,
} from "@/features/advertising/public-page-data.server";
import { businessTabTitle } from "@/lib/utils/tab-title";
import {
  BUSINESS_FAVICON_PLACEHOLDER,
  BUSINESS_LOGO_PLACEHOLDER,
} from "@/lib/brand/brand-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadAdvertisingPublicData();
  if (!data) return { title: "Ads | MultiTree" };
  const { business } = data;
  const brandImage = business.logo || business.default_avatar;
  const description = `خزمەتگوزاری ڕیکلامی تیکتۆک لە ${business.name}`;
  return {
    title: businessTabTitle(business.name, "Ads"),
    description: `پاکێج و زانیاری خزمەتگوزاری ڕیکلامی تیکتۆک لە ${business.name}`,
    icons: {
      icon: business.favicon || brandImage || BUSINESS_FAVICON_PLACEHOLDER,
      apple: brandImage || BUSINESS_LOGO_PLACEHOLDER,
    },
    openGraph: {
      title: businessTabTitle(business.name, "Ads"),
      description,
      images: brandImage ? [brandImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: businessTabTitle(business.name, "Ads"),
      description,
      images: brandImage ? [brandImage] : [],
    },
  };
}

export default async function AdvertisingPage() {
  const data = await loadAdvertisingPublicData();
  if (!data) notFound();

  return (
    <PublicAdvertisingService
      config={data.config}
      {...advertisingPublicProps(data)}
    />
  );
}
