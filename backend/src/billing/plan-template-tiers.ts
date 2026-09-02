export const BASIC_TEMPLATE_KEYS = [
  'spectrum',
  'spotlight',
  'liquid-glass',
] as const;

export const PRO_TEMPLATE_KEYS = [
  ...BASIC_TEMPLATE_KEYS,
  'frost',
  'aurora',
  'serenity',
] as const;

export const ULTRA_TEMPLATE_KEYS = [
  ...PRO_TEMPLATE_KEYS,
  'branch-signal',
] as const;

export const ULTRA_ONLY_TEMPLATE_KEYS = ['branch-signal'] as const;

export function isTemplateAllowedForPlanCode(
  templateKey: string,
  planCode: string,
): boolean {
  return (
    !ULTRA_ONLY_TEMPLATE_KEYS.some((key) => key === templateKey) ||
    planCode.trim().toLowerCase() === 'ultra'
  );
}

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
