"use client";

import { useState, type ComponentType } from "react";
import { BadgeDollarSign, BriefcaseBusiness, MonitorPlay, PartyPopper, Send, UserRound, WalletCards } from "lucide-react";
import { BusinessSectionDecorations } from "@/components/business/BusinessSectionDecorations";
import { PublicSectionHeading } from "@/components/public/PublicSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";
import { StepJourneyMockup } from "@/components/shared/StepJourneyMockup";
import { TikTokMark } from "@/lib/brand/marks";
import { cn } from "@/lib/utils";
import { AdvertisingSponsorTypeStep } from "./AdvertisingSponsorTypeStep";
import { AdvertisingPackageStep } from "./AdvertisingPackageStep";
import { AdvertisingPaymentStep } from "./AdvertisingPaymentStep";
import { AdvertisingReceiptStep } from "./AdvertisingReceiptStep";
import { AdvertisingVideoCodeStep, TIKTOK_VIDEO_CODE_PATTERN } from "./AdvertisingVideoCodeStep";
import { AdvertisingActivationStep } from "./AdvertisingActivationStep";
import type { AdvertisingPriceRow, SponsorCategory } from "../pricing-data";
import type { PaymentProvider, SponsorType } from "../journey-types";
import type { AdvertisingPaymentProvider } from "../types";

interface JourneyStep {
  number: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  accentClass: string;
  softClass: string;
  buttonClass: string;
  progressClass: string;
}

const JOURNEY_STEPS: ReadonlyArray<JourneyStep> = [
  {
    number: "01",
    title: "جۆری سپۆنسەر هەڵبژێرە",
    icon: UserRound,
    accentClass: "text-sky-600 dark:text-sky-300",
    softClass: "bg-sky-500/10",
    buttonClass: "bg-sky-500 text-white",
    progressClass: "bg-sky-500",
  },
  {
    number: "02",
    title: "پاکێج و نرخ هەڵبژێرە",
    icon: BadgeDollarSign,
    accentClass: "text-violet-600 dark:text-violet-300",
    softClass: "bg-violet-500/10",
    buttonClass: "bg-violet-500 text-white",
    progressClass: "bg-violet-500",
  },
  {
    number: "03",
    title: "پارەکە بنێرە",
    icon: WalletCards,
    accentClass: "text-amber-600 dark:text-amber-300",
    softClass: "bg-amber-400/12",
    buttonClass: "bg-amber-400 text-slate-950",
    progressClass: "bg-amber-400",
  },
  {
    number: "04",
    title: "وەسڵی پارەدان بنێرە",
    icon: Send,
    accentClass: "text-rose-600 dark:text-rose-300",
    softClass: "bg-rose-500/10",
    buttonClass: "bg-rose-500 text-white",
    progressClass: "bg-rose-500",
  },
  {
    number: "05",
    title: "ڤیدیۆی دەرهێنانی کۆد",
    icon: MonitorPlay,
    accentClass: "text-cyan-600 dark:text-cyan-300",
    softClass: "bg-cyan-500/10",
    buttonClass: "bg-cyan-500 text-white",
    progressClass: "bg-cyan-500",
  },
  {
    number: "06",
    title: "بنێرە بۆ واتساپ",
    icon: PartyPopper,
    accentClass: "text-emerald-600 dark:text-emerald-300",
    softClass: "bg-emerald-500/10",
    buttonClass: "bg-emerald-500 text-white",
    progressClass: "bg-emerald-500",
  },
];

const WHATSAPP_DIVIDER = "-------------------";

function buildWhatsAppMessage({
  sponsorType,
  price,
  paymentProvider,
  receiptUrl,
  videoCode,
}: {
  sponsorType: SponsorType;
  price: number;
  paymentProvider: PaymentProvider;
  receiptUrl: string | null;
  videoCode: string;
}) {
  const sponsorLabel = sponsorType === "personal" ? "شەخسی" : "بازرگانی";
  const priceText = `${price.toLocaleString()} دینار`;
  const receiptStatus = receiptUrl
    ? "دیاریکراوە — پێویستە وێنەکە بە دەست لەم چاتەدا بنێردرێت"
    : "هیچ وەسڵێک دیاری نەکراوە";
  const trimmedVideoCode = videoCode.trim();
  // Isolate the code as its own LTR run so the "#"/"=" edges don't get
  // reordered by WhatsApp's bidi rendering inside the surrounding RTL text.
  const isolatedVideoCode = `⁦${trimmedVideoCode}⁩`;

  return [
    "*داواکاری نوێی سپۆنسەر*",
    WHATSAPP_DIVIDER,
    `*جۆری سپۆنسەر:* ${sponsorLabel}`,
    `*نرخی پاکێج:* ${priceText}`,
    WHATSAPP_DIVIDER,
    `*شێوازی پارەدان:* ${paymentProvider}`,
    `*وەسڵی پارەدان:* ${receiptStatus}`,
    WHATSAPP_DIVIDER,
    trimmedVideoCode ? `*کۆدی ڤیدیۆ:*\n\`${isolatedVideoCode}\`` : null,
    WHATSAPP_DIVIDER,
    "_ئەم داواکارییە لە ڕێگەی پەڕەی سپۆنسەرینگەوە نێردراوە_",
  ]
    .filter(Boolean)
    .join("\n");
}

interface AdvertisingSponsorshipJourneyProps {
  whatsappNumber: string;
  videoUrl?: string;
  videoTutorialTitle?: string;
  tutorialSteps: string[];
  packageTiers?: Record<SponsorCategory, AdvertisingPriceRow[]>;
  paymentProviders?: readonly AdvertisingPaymentProvider[];
  receiptExampleImageUrl?: string;
}

export function AdvertisingSponsorshipJourney({
  whatsappNumber,
  videoUrl,
  videoTutorialTitle,
  tutorialSteps,
  packageTiers,
  paymentProviders,
  receiptExampleImageUrl,
}: AdvertisingSponsorshipJourneyProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [sponsorType, setSponsorType] = useState<SponsorType>("personal");
  const [selectedPrices, setSelectedPrices] = useState<Record<SponsorType, number>>({
    personal: packageTiers?.personal?.[0]?.price ?? 0,
    business: packageTiers?.business?.[0]?.price ?? 0,
  });
  // Businesses can rename/delete providers, so no catalog name is a safe
  // default — take whatever is actually first in their list, and nothing at all
  // when they have not published any.
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(
    () => paymentProviders?.[0]?.name ?? "",
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [videoCode, setVideoCode] = useState("");

  const canAdvance =
    activeStep === 1
      ? selectedPrices[sponsorType] > 0
      : activeStep === 2
        ? Boolean(paymentProvider)
        : activeStep === 3
          ? Boolean(receiptUrl)
          : activeStep === 4
            ? TIKTOK_VIDEO_CODE_PATTERN.test(videoCode.trim())
            : activeStep === 5
              ? Boolean(whatsappNumber.replace(/\D/g, ""))
              : true;

  const selectPrice = (type: SponsorType, price: number) =>
    setSelectedPrices((current) => ({ ...current, [type]: price }));

  const handleWhatsAppSubmit = () => {
    const destination = whatsappNumber.replace(/\D/g, "");
    if (!destination) return;
    const message = buildWhatsAppMessage({
      sponsorType,
      price: selectedPrices[sponsorType],
      paymentProvider,
      receiptUrl,
      videoCode,
    });
    const url = `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <PublicSection
      id="how-it-works"
      labelledBy="advertising-journey-title"
      decorations={
        <BusinessSectionDecorations
          colors={["#38bdf8", "#34d399"]}
          labels={["هەڵبژاردن", "ئەکتیڤکردن"]}
          variant={1}
        />
      }
    >
        <PublicSectionHeading
          id="advertising-journey-title"
          eyebrow="Quick sponsorship guide"
          eyebrowColor="var(--advertising-accent)"
          title="قۆناغەکانی سپۆنسەر کردن"
          description="لە هەڵبژاردنی جۆری سپۆنسەرەوە تا ئەکتیڤبوونی ڤیدیۆکەت، هەموو هەنگاوەکان بە سادەیی ببینە"
        />

        <StepJourneyMockup
          title="Sponsorship guide"
          brandIcon={<TikTokMark className="h-5.5 w-5.5" />}
          steps={JOURNEY_STEPS}
          activeStep={activeStep}
          onStepChange={setActiveStep}
          titleBadge={
            activeStep === 1 ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black",
                  sponsorType === "personal"
                    ? "bg-lime-500/12 text-lime-700 dark:text-lime-300"
                    : "bg-violet-500/12 text-violet-700 dark:text-violet-300",
                )}
              >
                {sponsorType === "personal" ? (
                  <UserRound className="h-3 w-3" />
                ) : (
                  <BriefcaseBusiness className="h-3 w-3" />
                )}
                {sponsorType === "personal" ? "Personal" : "Business"}
              </span>
            ) : undefined
          }
          footerNote="هیچ کات وشەی نهێنی یان زانیاری چوونەژوورەوەت مەبنێرە؛ تەنها وەسڵ و کۆدی ڤیدیۆ پێویستن"
          onSubmit={handleWhatsAppSubmit}
          submitLabel="بنێرە بۆ واتساپ"
          backButtonClass="border-black text-black hover:bg-black/5"
          nextButtonClass="bg-black text-white"
          progressBarClass="bg-black"
          canAdvance={canAdvance}
          className="mt-12 sm:mt-16"
        >
          {activeStep === 0 && (
            <AdvertisingSponsorTypeStep selected={sponsorType} onChange={setSponsorType} />
          )}
          {activeStep === 1 && (
            <AdvertisingPackageStep
              sponsorType={sponsorType}
              selectedPrices={selectedPrices}
              onPriceChange={selectPrice}
              packageTiers={packageTiers}
            />
          )}
          {activeStep === 2 && (
            <AdvertisingPaymentStep
              selected={paymentProvider}
              onChange={setPaymentProvider}
              providers={paymentProviders ?? []}
            />
          )}
          {activeStep === 3 && (
            <AdvertisingReceiptStep
              receiptUrl={receiptUrl}
              onReceiptChange={setReceiptUrl}
              exampleImageUrl={receiptExampleImageUrl}
            />
          )}
          {activeStep === 4 && (
            <AdvertisingVideoCodeStep
              videoCode={videoCode}
              onVideoCodeChange={setVideoCode}
              videoSrc={videoUrl}
              tutorialSteps={tutorialSteps}
              title={videoTutorialTitle}
            />
          )}
          {activeStep === 5 && <AdvertisingActivationStep />}
        </StepJourneyMockup>
    </PublicSection>
  );
}
