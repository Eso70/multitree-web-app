"use client";

import Image from "next/image";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PAYMENT_PROVIDER_LOGOS } from "@/features/mini-website/payment-providers";
import { copyToClipboard } from "@/lib/utils/clipboard";
import type { PaymentProvider } from "../journey-types";
import type { AdvertisingPaymentProvider } from "../types";

// Every provider that ships a real logo under /images/payment-providers.
// "cash"/"bankTransfer"/"custom" from the source catalog have no logo asset,
// so they're deliberately left out here.
export const PROVIDER_LOGOS: Partial<Record<PaymentProvider, string>> = {
  FIB: PAYMENT_PROVIDER_LOGOS.fib,
  QiCard: PAYMENT_PROVIDER_LOGOS.qicard,
  FastPay: PAYMENT_PROVIDER_LOGOS.fastpay,
  Korek: PAYMENT_PROVIDER_LOGOS.korek,
  ZainCash: PAYMENT_PROVIDER_LOGOS.zaincash,
  NassWallet: PAYMENT_PROVIDER_LOGOS.nasspay,
};

interface AdvertisingPaymentStepProps {
  selected: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  /**
   * The business's own payment destinations. There is deliberately no fallback
   * list: this step tells a customer where to send money, and inventing a
   * default would publish someone else's phone number under this business's
   * name. The journey hides the step when the list is empty.
   */
  providers: readonly AdvertisingPaymentProvider[];
}

export function AdvertisingPaymentStep({ selected, onChange, providers }: AdvertisingPaymentStepProps) {
  const list = providers;

  // Better to say the business has not published its payment details than to
  // show an empty picker the visitor cannot act on.
  if (list.length === 0) {
    return (
      <div className="w-full">
        <p
          className="mx-auto max-w-md text-center text-sm leading-7 text-black/48 dark:text-white/48"
          dir="auto"
        >
          هێشتا شێوازی پارەدان دانەنراوە. تکایە پەیوەندی بە خاوەنی خزمەتگوزارییەکەوە بکە.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="mb-5 text-center text-sm leading-7 text-black/48 dark:text-white/48" dir="auto">
        شێوازی پارەدان هەڵبژێرە
      </p>
      <div role="radiogroup" aria-label="شێوازی پارەدان" className="mx-auto flex w-full max-w-md flex-col gap-2.5">
        {list.map((provider) => {
          const isSelected = selected === provider.name;
          const logo = provider.logoUrl || PROVIDER_LOGOS[provider.name];

          const copyPhone = async () => {
            const copied = await copyToClipboard(provider.phone);
            if (copied) toast.success("ژمارە کۆپی کرا");
            else toast.error("کۆپی نەکرا");
          };

          return (
            <div
              key={provider.id}
              role="radio"
              tabIndex={0}
              aria-checked={isSelected}
              onClick={() => onChange(provider.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(provider.name);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 outline-none transition-all sm:p-4",
                isSelected
                  ? "border-amber-400 bg-amber-400/[0.06] shadow-sm"
                  : "border-black/8 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected ? "border-amber-500" : "border-black/20 dark:border-white/25",
                )}
              >
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
              </span>

              {logo && (
                <Image
                  src={logo}
                  alt={`${provider.name} logo`}
                  width={56}
                  height={36}
                  className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1.5 shadow-sm"
                  unoptimized={Boolean(provider.logoUrl)}
                />
              )}

              <div className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-black">{provider.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate text-xs tabular-nums text-black/48 dark:text-white/48" dir="ltr">
                    {provider.phone}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      copyPhone();
                    }}
                    aria-label={`کۆپیکردنی ژمارەی ${provider.name}`}
                    title="کۆپیکردنی ژمارە"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-black/40 transition-colors hover:bg-black/[0.06] hover:text-black/70 dark:text-white/40 dark:hover:bg-white/[0.1] dark:hover:text-white/80"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
