import { isTrustedInternalProxy } from './internal-proxy-trust';

describe('isTrustedInternalProxy', () => {
  const ORIGINAL_SESSION_SECRET = process.env.SESSION_SECRET;
  const ORIGINAL_INTERNAL_PROXY_SECRET = process.env.INTERNAL_PROXY_SECRET;

  afterEach(() => {
    process.env.SESSION_SECRET = ORIGINAL_SESSION_SECRET;
    process.env.INTERNAL_PROXY_SECRET = ORIGINAL_INTERNAL_PROXY_SECRET;
  });

  it('trusts a matching INTERNAL_PROXY_SECRET', () => {
    process.env.INTERNAL_PROXY_SECRET = 'a'.repeat(32);
    process.env.SESSION_SECRET = 'b'.repeat(32);
    expect(isTrustedInternalProxy('a'.repeat(32))).toBe(true);
  });

  it('falls back to SESSION_SECRET when INTERNAL_PROXY_SECRET is unset', () => {
    delete process.env.INTERNAL_PROXY_SECRET;
    process.env.SESSION_SECRET = 'b'.repeat(32);
    expect(isTrustedInternalProxy('b'.repeat(32))).toBe(true);
  });

  it('rejects a wrong key', () => {
    process.env.INTERNAL_PROXY_SECRET = 'a'.repeat(32);
    expect(isTrustedInternalProxy('wrong-key')).toBe(false);
  });

  it('rejects a missing key', () => {
    process.env.INTERNAL_PROXY_SECRET = 'a'.repeat(32);
    expect(isTrustedInternalProxy(undefined)).toBe(false);
  });

  it('rejects when neither secret is configured', () => {
    delete process.env.INTERNAL_PROXY_SECRET;
    delete process.env.SESSION_SECRET;
    expect(isTrustedInternalProxy('anything')).toBe(false);
  });

  it('rejects a non-string header value', () => {
    process.env.INTERNAL_PROXY_SECRET = 'a'.repeat(32);
    expect(isTrustedInternalProxy(['a'.repeat(32)])).toBe(false);
  });
});
