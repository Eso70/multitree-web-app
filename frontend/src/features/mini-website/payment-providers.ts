import {
  MINI_WEBSITE_PAYMENT_PROVIDER_LABELS,
  type MiniWebsitePaymentMethod,
  type MiniWebsitePaymentProvider,
} from "@linktree/types";

export const PAYMENT_PROVIDER_LABELS = MINI_WEBSITE_PAYMENT_PROVIDER_LABELS;

export const PAYMENT_PROVIDER_LOGOS: Partial<
  Record<MiniWebsitePaymentProvider, string>
> = {
  fib: "/images/payment-providers/fib.jpg",
  fastpay: "/images/payment-providers/fastpay.jpg",
  qicard: "/images/payment-providers/qicard.jpg",
  korek: "/images/payment-providers/korek.jpg",
  zaincash: "/images/payment-providers/zaincash.jpg",
  nasspay: "/images/payment-providers/nasswallet.jpg",
};

export function hasBuiltInPaymentLogo(
  provider: MiniWebsitePaymentProvider,
): boolean {
  return Boolean(PAYMENT_PROVIDER_LOGOS[provider]);
}

export function paymentMethodLogo(
  method: Pick<MiniWebsitePaymentMethod, "provider" | "image">,
): string {
  return PAYMENT_PROVIDER_LOGOS[method.provider] ?? method.image;
}

export function paymentMethodName(
  method: Pick<MiniWebsitePaymentMethod, "provider" | "name">,
): string {
  return method.provider === "custom"
    ? method.name
    : PAYMENT_PROVIDER_LABELS[method.provider];
}
