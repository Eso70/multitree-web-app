import Image from "next/image";
import { Star } from "lucide-react";
import { RailButton, SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT } from "../liquid-glass-utils";
import { paymentMethodIcon } from "./section-utils";
import { usePagedItems } from "./use-paged-items";
import {
  hasBuiltInPaymentLogo,
  paymentMethodLogo,
  paymentMethodName,
} from "@/features/mini-website/payment-providers";
import type { MiniWebsitePaymentMethod } from "@/features/mini-website/types";

/** Payment rows are compact, so a full board of four fits before the arrows. */
const PAYMENTS_PER_PAGE = 4;

export function PaymentMethodsSection({
  methods,
  tone = SWISS_ACCENT,
  ...frame
}: {
  methods: MiniWebsitePaymentMethod[];
  fullPage: boolean;
  accent: string;
  tone?: string;
  index?: number;
  title: string;
  description?: string;
  icon: typeof Star;
}) {
  const shown = methods.filter((method) => paymentMethodName(method).trim());
  // Declared before the early return so the hook order never depends on
  // whether a business has any payment methods.
  const { pageCount, visible, next, previous } = usePagedItems(
    shown,
    PAYMENTS_PER_PAGE,
  );

  if (!shown.length) return null;

  return (
    <SectionFrame tone={tone} {...frame}>
      <div className="relative">
        <div className="space-y-2">
          {visible.map((method) => {
            const Icon = paymentMethodIcon(method.provider);
            const logo = paymentMethodLogo(method);
            return (
              <article
                key={method.id}
                dir="rtl"
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-900/10 px-3.5 py-3.5 transition duration-300 hover:-translate-y-0.5 dark:border-white/10"
              >
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-900/[0.06] text-current dark:bg-white/10">
                  {logo ? (
                    <Image
                      src={logo}
                      alt=""
                      fill
                      className={
                        hasBuiltInPaymentLogo(method.provider)
                          ? "object-cover"
                          : "object-contain p-1.5"
                      }
                      unoptimized
                    />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <strong
                    className="block text-xs font-black sm:text-sm"
                    dir="auto"
                  >
                    {paymentMethodName(method)}
                  </strong>
                  {method.accountName && (
                    <span
                      className="mt-1 block text-[10px] font-bold opacity-55"
                      dir="auto"
                    >
                      {method.accountName}
                    </span>
                  )}
                  {method.accountNumber && (
                    <code
                      className="mt-1.5 block break-all text-[11px] font-black tracking-wide opacity-75"
                      dir="ltr"
                    >
                      {method.accountNumber}
                    </code>
                  )}
                  {method.instructions && (
                    <span
                      className="mt-1.5 block text-[10px] leading-4 opacity-50"
                      dir="auto"
                    >
                      {method.instructions}
                    </span>
                  )}
                </span>
              </article>
            );
          })}
        </div>

        {pageCount > 1 && (
          <>
            <RailButton
              side="left"
              label="شێوازی پارەدانی پێشوو"
              onClick={previous}
            />
            <RailButton
              side="right"
              label="شێوازی پارەدانی دواتر"
              onClick={next}
            />
          </>
        )}
      </div>
    </SectionFrame>
  );
}
