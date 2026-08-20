"use client";

import { Send } from "lucide-react";
import { PublicCallToActionSection } from "@/components/public/PublicCallToActionSection";

interface AdvertisingClosingCtaSectionProps {
  title: string;
  description: string;
  buttonLabel: string;
  whatsappHref: string;
}

export function AdvertisingClosingCtaSection({
  title,
  description,
  buttonLabel,
  whatsappHref,
}: AdvertisingClosingCtaSectionProps) {
  return (
    <PublicCallToActionSection
      accentColor="var(--advertising-accent)"
      accentInk="var(--advertising-accent-ink)"
      title={title}
      description={description}
      primaryAction={{
        label: buttonLabel,
        href: whatsappHref,
        external: whatsappHref.startsWith("http"),
        icon: <Send className="h-4 w-4" />,
      }}
    />
  );
}
