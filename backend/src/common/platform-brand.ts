export const SPONSOR_KRD_ACCENT_VALUE = 'gradient:to-r:#25F4EE:#FE2C55';

export function normalizeSponsorKrdAccent(value?: string | null): string {
  const resolved = value?.trim();
  return resolved || SPONSOR_KRD_ACCENT_VALUE;
}
