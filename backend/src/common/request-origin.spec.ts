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
