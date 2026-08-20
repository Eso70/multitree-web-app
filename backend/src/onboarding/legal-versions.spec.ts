import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '@linktree/types';
import { PRIVACY_VERSION, TERMS_VERSION } from './business-onboarding.service';

/**
 * `business-onboarding.service.ts` copies these values instead of importing
 * them, because `@linktree/types` is source-only and Node cannot resolve its
 * extensionless re-exports as ESM at runtime. ts-jest compiles to CommonJS, so
 * the shared values import cleanly here and the duplication can be checked
 * rather than trusted.
 *
 * A drift here means an owner reads a document labelled one revision while
 * `business_signup_applications` records their consent against another, and
 * `submitApplication` then rejects the draft it just accepted.
 */
describe('legal document versions mirrored from @linktree/types', () => {
  it('stamps acceptance rows with the revision the pages display', () => {
    expect(TERMS_VERSION).toBe(LEGAL_TERMS_VERSION);
    expect(PRIVACY_VERSION).toBe(LEGAL_PRIVACY_VERSION);
  });
});
