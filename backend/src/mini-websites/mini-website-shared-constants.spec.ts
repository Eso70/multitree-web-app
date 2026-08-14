import {
  MINI_WEBSITE_ITEM_PIXEL_EVENTS,
  MINI_WEBSITE_SECTION_KEYS,
} from '@linktree/types';
import {
  ITEM_PIXEL_EVENTS,
  OFFERED_SECTION_KEYS,
} from './mini-websites.service';

/**
 * `mini-websites.service.ts` mirrors these constants instead of importing them,
 * because `@linktree/types` is source-only and Node cannot resolve its
 * extensionless re-exports as ESM at runtime. That constraint does not apply
 * here: ts-jest compiles to CommonJS, so the shared values import cleanly and
 * the duplication can be checked instead of trusted.
 *
 * Membership is compared as a set. Order is deliberately not asserted — the
 * backend list drives the order sections render in, while the shared list is
 * the contract's catalogue.
 */
describe('mini-website constants mirrored from @linktree/types', () => {
  it('offers exactly the section keys the shared contract declares', () => {
    expect([...OFFERED_SECTION_KEYS].sort()).toEqual(
      [...MINI_WEBSITE_SECTION_KEYS].sort(),
    );
  });

  it('accepts exactly the item pixel events the shared contract declares', () => {
    expect([...ITEM_PIXEL_EVENTS].sort()).toEqual(
      [...MINI_WEBSITE_ITEM_PIXEL_EVENTS].sort(),
    );
  });

  it('has no duplicate section keys', () => {
    expect(new Set(OFFERED_SECTION_KEYS).size).toBe(
      OFFERED_SECTION_KEYS.length,
    );
  });
});
