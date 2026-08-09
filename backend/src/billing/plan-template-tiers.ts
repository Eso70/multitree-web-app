export const BASIC_TEMPLATE_KEYS = [
  'colorful-pills',
  'mobile-spotlight',
] as const;

export const PRO_TEMPLATE_KEYS = [
  ...BASIC_TEMPLATE_KEYS,
  'frosted-outline',
  'aurora-pills',
  'gentle-flow',
  'hero-image',
] as const;

export const ULTRA_TEMPLATE_KEYS = [...PRO_TEMPLATE_KEYS, 'dark-card'] as const;

export function getDefaultTemplateKeys(planCode: string): readonly string[] {
  switch (planCode.trim().toLowerCase()) {
    case 'ultra':
      return ULTRA_TEMPLATE_KEYS;
    case 'pro':
      return PRO_TEMPLATE_KEYS;
    default:
      return BASIC_TEMPLATE_KEYS;
  }
}
