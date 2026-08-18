import {
  BASIC_TEMPLATE_KEYS,
  PRO_TEMPLATE_KEYS,
  ULTRA_TEMPLATE_KEYS,
  getDefaultTemplateKeys,
} from './plan-template-tiers';

describe('plan template tiers', () => {
  it('assigns the requested cumulative template catalogs', () => {
    expect(BASIC_TEMPLATE_KEYS).toEqual([
      'spectrum',
      'spotlight',
      'liquid-glass',
    ]);
    expect(PRO_TEMPLATE_KEYS).toEqual([
      ...BASIC_TEMPLATE_KEYS,
      'frost',
      'aurora',
      'serenity',
    ]);
    expect(ULTRA_TEMPLATE_KEYS).toEqual([...PRO_TEMPLATE_KEYS]);
  });

  it('uses Basic as the safe default for custom plan codes', () => {
    expect(getDefaultTemplateKeys('basic')).toBe(BASIC_TEMPLATE_KEYS);
    expect(getDefaultTemplateKeys('pro')).toBe(PRO_TEMPLATE_KEYS);
    expect(getDefaultTemplateKeys('ultra')).toBe(ULTRA_TEMPLATE_KEYS);
    expect(getDefaultTemplateKeys('custom')).toBe(BASIC_TEMPLATE_KEYS);
  });
});
