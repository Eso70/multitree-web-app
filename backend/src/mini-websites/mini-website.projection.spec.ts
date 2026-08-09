import { CONTENT_SELECT } from './mini-website.projection';

describe('mini website database projection', () => {
  it('keeps every persisted section needed by hydration', () => {
    for (const alias of [
      'sections',
      'social_links',
      'locations',
      'services',
      'lead_form',
      'lead_fields',
      'plans',
    ]) {
      expect(CONTENT_SELECT).toContain(`AS ${alias}`);
    }
  });
});
