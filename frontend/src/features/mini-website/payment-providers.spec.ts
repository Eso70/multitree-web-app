import {
  MINI_WEBSITE_PAYMENT_PROVIDERS,
  createMiniWebsitePaymentMethod,
} from "@linktree/types";
import {
  hasBuiltInPaymentLogo,
  paymentMethodLogo,
  paymentMethodName,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_LOGOS,
} from "./payment-providers";

describe("mini website payment providers", () => {
  it("keeps every supported provider labelled", () => {
    expect(Object.keys(PAYMENT_PROVIDER_LABELS)).toEqual(
      expect.arrayContaining([...MINI_WEBSITE_PAYMENT_PROVIDERS]),
    );
  });

  it("maps every supplied provider to its built-in public logo", () => {
    expect(PAYMENT_PROVIDER_LOGOS).toEqual({
      fib: "/images/payment-providers/fib.jpg",
      fastpay: "/images/payment-providers/fastpay.jpg",
      qicard: "/images/payment-providers/qicard.jpg",
      korek: "/images/payment-providers/korek.jpg",
      zaincash: "/images/payment-providers/zaincash.jpg",
      nasspay: "/images/payment-providers/nasswallet.jpg",
    });
    expect(hasBuiltInPaymentLogo("qicard")).toBe(true);
    expect(hasBuiltInPaymentLogo("cash")).toBe(false);
  });

  it("prefers built-in branding and preserves custom branding", () => {
    const qicard = {
      ...createMiniWebsitePaymentMethod("qicard", "qicard-1"),
      image: "/images/upload/old-logo.png",
    };
    const custom = {
      ...createMiniWebsitePaymentMethod("custom", "custom-1"),
      name: "Local Wallet",
      image: "/images/upload/local-wallet.png",
    };

    expect(paymentMethodLogo(qicard)).toBe(
      "/images/payment-providers/qicard.jpg",
    );
    expect(paymentMethodName(qicard)).toBe("Qi Card / SuperQi");
    expect(paymentMethodLogo(custom)).toBe("/images/upload/local-wallet.png");
    expect(paymentMethodName(custom)).toBe("Local Wallet");
  });
});
