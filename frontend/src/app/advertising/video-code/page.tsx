import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicVideoCodePage } from "@/features/advertising/components/PublicVideoCodePage";
import {
  advertisingPublicProps,
  loadAdvertisingPublicData,
} from "@/features/advertising/public-page-data.server";
import { businessTabTitle } from "@/lib/utils/tab-title";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadAdvertisingPublicData();
  if (!data) return { title: "Video Code | MultiTree" };
  const { business } = data;
  const brandImage = business.logo || business.default_avatar;
  const description = `فێرکاری دەرهێنانی کۆدی ڤیدیۆی سپارک ئادسی تیکتۆک لە ${business.name}`;
  return {
    title: businessTabTitle(business.name, "Ads"),
    description,
    icons: {
      icon: business.favicon || brandImage || "/images/Logo.jpg",
      apple: brandImage || "/images/Logo.jpg",
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

export default async function AdvertisingVideoCodePage() {
  const data = await loadAdvertisingPublicData();
  if (!data) notFound();

  return (
    <PublicVideoCodePage
      config={data.config}
      {...advertisingPublicProps(data)}
    />
  );
}
