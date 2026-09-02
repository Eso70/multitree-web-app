import type {
  MiniWebsiteBackgroundStyle,
  MiniWebsitePaymentProvider,
  MiniWebsiteVisualTemplateKey,
} from '@linktree/types';

/**
 * Backend runtime allow-lists.
 *
 * `@linktree/types` is consumed as TypeScript source by the frontend, so the
 * standalone Node backend must only import its types. Keeping runtime
 * validation here prevents production startup from trying to execute `.ts`
 * package exports.
 */
export const MINI_WEBSITE_VISUAL_TEMPLATE_KEYS: readonly MiniWebsiteVisualTemplateKey[] =
  ['liquid-glass'];

export const MINI_WEBSITE_VISUAL_TEMPLATE_DEFAULT: MiniWebsiteVisualTemplateKey =
  'liquid-glass';

export const MINI_WEBSITE_BACKGROUND_STYLES: readonly MiniWebsiteBackgroundStyle[] =
  [
    'none',
    'grid',
    'grid45',
    'dots',
    'diagonal',
    'cross',
    'circles',
    'waves',
    'zigzag',
  ];

export const MINI_WEBSITE_PAYMENT_PROVIDERS: readonly MiniWebsitePaymentProvider[] =
  [
    'fib',
    'fastpay',
    'qicard',
    'korek',
    'zaincash',
    'nasspay',
    'cash',
    'bankTransfer',
    'custom',
  ];

export const MINI_WEBSITE_MAX_PAYMENT_METHODS = 12;

export const MINI_WEBSITE_MAX_PLANS = 6;
export const MINI_WEBSITE_MAX_PLAN_FEATURES = 20;
