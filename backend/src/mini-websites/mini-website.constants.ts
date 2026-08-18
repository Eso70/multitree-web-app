import type {
  MiniWebsiteBackgroundStyle,
  MiniWebsiteLeadFieldMapping,
  MiniWebsiteLeadFieldType,
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

export const MINI_WEBSITE_LEAD_FIELD_TYPES: readonly MiniWebsiteLeadFieldType[] =
  [
    'text',
    'textarea',
    'email',
    'phone',
    'number',
    'select',
    'date',
    'checkbox',
  ];

export const MINI_WEBSITE_LEAD_FIELD_MAPPINGS: readonly MiniWebsiteLeadFieldMapping[] =
  ['none', 'name', 'email', 'phone'];

/**
 * The field type each CRM mapping may be claimed by.
 *
 * A mapping decides which encrypted contact column an answer lands in, so a
 * `select` claiming to be an email address would put an arbitrary chosen option
 * into the column a TikTok custom audience is later hashed from.
 */
export const MINI_WEBSITE_LEAD_MAPPING_TYPES: Record<
  Exclude<MiniWebsiteLeadFieldMapping, 'none'>,
  readonly MiniWebsiteLeadFieldType[]
> = {
  name: ['text'],
  email: ['email'],
  phone: ['phone'],
};

export const MINI_WEBSITE_MAX_LEAD_FIELDS = 12;
export const MINI_WEBSITE_MAX_LEAD_FIELD_OPTIONS = 20;
export const MINI_WEBSITE_MAX_LEAD_ANSWER_LENGTH = 1_000;
export const MINI_WEBSITE_MAX_PLANS = 6;
export const MINI_WEBSITE_MAX_PLAN_FEATURES = 20;
