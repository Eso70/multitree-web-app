import {
  isAuthenticatedMutation,
  isSameOriginBrowserRequest,
} from './request-origin';

describe('request origin protection', () => {
  it('identifies cookie-authenticated mutations', () => {
    expect(isAuthenticatedMutation('POST', { business_session: 'token' })).toBe(
      true,
    );
    expect(isAuthenticatedMutation('GET', { business_session: 'token' })).toBe(
      false,
    );
    expect(isAuthenticatedMutation('POST', {})).toBe(false);
  });

  /**
   * A session type missing from the cookie list is not treated as
   * authenticated, so the same-origin check is skipped rather than failed —
   * the Creator workspace shipped its writes with no cross-origin rejection at
   * all until `creator_session` was added.
   */
  it('recognises every session cookie that can authenticate a mutation', () => {
    expect(isAuthenticatedMutation('PUT', { creator_session: 'token' })).toBe(
      true,
    );
    expect(
      isAuthenticatedMutation('DELETE', { platform_admin_session: 'token' }),
    ).toBe(true);
    expect(isAuthenticatedMutation('GET', { creator_session: 'token' })).toBe(
      false,
    );
  });

  it('accepts same-origin and server requests', () => {
    expect(
      isSameOriginBrowserRequest(
        'https://tenant.example.com',
        undefined,
        'tenant.example.com',
        'https',
        'http',
      ),
    ).toBe(true);
    expect(
      isSameOriginBrowserRequest(
        undefined,
        undefined,
        'tenant.example.com',
        'https',
        'http',
      ),
    ).toBe(true);
  });

  it('rejects cross-origin, opaque, malformed, or unverifiable origins', () => {
    expect(
      isSameOriginBrowserRequest(
        'https://evil.example',
        undefined,
        'tenant.example.com',
        'https',
        'http',
      ),
    ).toBe(false);
    expect(
      isSameOriginBrowserRequest(
        'null',
        undefined,
        'tenant.example.com',
        'https',
        'http',
      ),
    ).toBe(false);
    expect(
      isSameOriginBrowserRequest(
        'not-a-url',
        undefined,
        'tenant.example.com',
        'https',
        'http',
      ),
    ).toBe(false);
    expect(
      isSameOriginBrowserRequest(
        'https://tenant.example.com',
        undefined,
        undefined,
        'https',
        'http',
      ),
    ).toBe(false);
  });
});
