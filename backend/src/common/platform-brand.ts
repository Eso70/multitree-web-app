export const SPONSOR_KRD_ACCENT_VALUE = 'gradient:to-r:#25F4EE:#FE2C55';

export const LEGACY_MULTITREE_ACCENT_COLOR = '#b6f20d';

/** Keeps pre-migration platform rows from repainting Sponsor.krd with lime. */
export function normalizeSponsorKrdAccent(value?: string | null): string {
  const resolved = value?.trim();
  if (!resolved || resolved.toLowerCase() === LEGACY_MULTITREE_ACCENT_COLOR) {
    return SPONSOR_KRD_ACCENT_VALUE;
  }
  return resolved;
}
