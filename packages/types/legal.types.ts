/**
 * Versions of the published legal documents.
 *
 * The signup flow records which revision an owner accepted
 * (`business_signup_applications.terms_version` / `privacy_version`) and
 * `submitApplication` refuses a draft that still carries an older one, so the
 * label rendered on `/legal/terms` and `/legal/privacy` and the value written
 * to that row must be the same string. They lived in two places and drifted:
 * the privacy text gained its TikTok Pixel / Events API disclosure and the
 * page label moved to `2026-08-19` while the backend kept stamping
 * `2026-08-09` onto the acceptance record.
 *
 * The frontend reads these directly. The backend cannot — `@linktree/types`
 * is source-only and Node cannot resolve its extensionless re-exports at
 * runtime — so `business-onboarding.service.ts` mirrors the values and
 * `legal-versions.spec.ts` asserts the copies still match, the same
 * arrangement `linktree-defaults.ts` uses.
 *
 * Bump a version only when the document's wording actually changes: a bump
 * invalidates every draft application accepted against the previous revision.
 */

/** Last change: liability and plan wording. */
export const LEGAL_TERMS_VERSION = "2026-08-09";

/** Last change: TikTok Pixel and Events API collection disclosed in §3. */
export const LEGAL_PRIVACY_VERSION = "2026-08-19";
