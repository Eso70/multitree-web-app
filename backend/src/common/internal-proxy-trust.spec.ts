import { isTrustedInternalProxy } from './internal-proxy-trust';

describe('isTrustedInternalProxy', () => {
  const ORIGINAL_SESSION_SECRET = process.env.SESSION_SECRET;
  const ORIGINAL_REQUEST_TRACKING_SECRET = process.env.REQUEST_TRACKING_SECRET;

  afterEach(() => {
    process.env.SESSION_SECRET = ORIGINAL_SESSION_SECRET;
    process.env.REQUEST_TRACKING_SECRET = ORIGINAL_REQUEST_TRACKING_SECRET;
  });

  it('trusts a matching REQUEST_TRACKING_SECRET', () => {
    process.env.REQUEST_TRACKING_SECRET = 'a'.repeat(32);
    process.env.SESSION_SECRET = 'b'.repeat(32);
    expect(isTrustedInternalProxy('a'.repeat(32))).toBe(true);
  });

  it('falls back to SESSION_SECRET when REQUEST_TRACKING_SECRET is unset', () => {
    delete process.env.REQUEST_TRACKING_SECRET;
    process.env.SESSION_SECRET = 'b'.repeat(32);
    expect(isTrustedInternalProxy('b'.repeat(32))).toBe(true);
  });

  it('rejects a wrong key', () => {
    process.env.REQUEST_TRACKING_SECRET = 'a'.repeat(32);
    expect(isTrustedInternalProxy('wrong-key')).toBe(false);
  });

  it('rejects a missing key', () => {
    process.env.REQUEST_TRACKING_SECRET = 'a'.repeat(32);
    expect(isTrustedInternalProxy(undefined)).toBe(false);
  });

  it('rejects when neither secret is configured', () => {
    delete process.env.REQUEST_TRACKING_SECRET;
    delete process.env.SESSION_SECRET;
    expect(isTrustedInternalProxy('anything')).toBe(false);
  });

  it('rejects a non-string header value', () => {
    process.env.REQUEST_TRACKING_SECRET = 'a'.repeat(32);
    expect(isTrustedInternalProxy(['a'.repeat(32)])).toBe(false);
  });
});
