import { readFileSync } from 'fs';
import { join } from 'path';
import { isWebsiteColor, WEBSITE_COLOR_MAX_LENGTH } from './website-color';

describe('website colour validation', () => {
  it.each([
    '#abc',
    '#ABCDEF',
    '#000000',
    'gradient:to-r:#ff0000:#0000ff',
    'gradient:radial:#fff:#000',
    'gradient:to-tl:#abc:#abcdef',
  ])('accepts %s', (value) => {
    expect(isWebsiteColor(value)).toBe(true);
  });

  /**
   * `#abcd` is the value class that mattered: two validators used to accept it
   * and no browser draws it, so the declaration was dropped and the page
   * rendered with no background at all.
   */
  it.each([
    '#abcd',
    '#abcde',
    '#ab',
    'abcdef',
    'red',
    'gradient:sideways:#ff0000:#0000ff',
    'gradient:to-r:#abcd:#000000',
    'gradient:to-r:#ff0000',
    'url(https://example.com/x.png)',
    '#000000; background: url(https://example.com)',
  ])('refuses %s', (value) => {
    expect(isWebsiteColor(value)).toBe(false);
  });

  it('bounds the longest value it can accept', () => {
    const longest = 'gradient:to-br:#abcdef:#abcdef';
    expect(isWebsiteColor(longest)).toBe(true);
    expect(longest.length).toBeLessThanOrEqual(WEBSITE_COLOR_MAX_LENGTH);
  });

  /**
   * Five copies of this rule had drifted apart. Any new colour field validates
   * against the shared constant instead of growing a sixth.
   */
  it('is the only colour format regex the DTOs carry', () => {
    const dtos = [
      'linktrees/dto/create-linktree.dto.ts',
      'linktrees/dto/update-linktree.dto.ts',
      'auth/dto/business-onboarding.dto.ts',
      'mini-websites/dto/mini-website.dto.ts',
      'platform-admin/dto/platform-settings.dto.ts',
    ];

    for (const relative of dtos) {
      const source = readFileSync(join(__dirname, '..', relative), 'utf8');
      expect(source).toContain('WEBSITE_COLOR_PATTERN');
      expect(source).not.toMatch(/gradient:\(\?:to-r|gradient:\(to-r/);
    }
  });
});
