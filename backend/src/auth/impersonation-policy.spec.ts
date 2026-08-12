import { impersonationDenialReason } from './impersonation-policy';

describe('impersonation restriction policy', () => {
  it('allows ordinary business work', () => {
    expect(impersonationDenialReason('GET', '/api/linktrees')).toBeNull();
    expect(impersonationDenialReason('PATCH', '/api/auth/settings')).toBeNull();
    expect(impersonationDenialReason('GET', '/api/auth/sessions')).toBeNull();
  });

  it('blocks reading a stored tenant secret back in plaintext', () => {
    expect(
      impersonationDenialReason(
        'GET',
        '/api/auth/tiktok/8d1f6d9e-0f6a-4f2f-9f0b-1f2a3b4c5d6e/secret',
      ),
    ).toMatch(/cannot be read back/i);
  });

  it('blocks revoking business sessions from inside the tenant', () => {
    expect(impersonationDenialReason('DELETE', '/api/auth/sessions')).toMatch(
      /cannot be revoked/i,
    );
    expect(
      impersonationDenialReason('DELETE', '/api/auth/sessions/session-id'),
    ).toMatch(/cannot be revoked/i);
  });

  it('matches on the path only, so a query string cannot evade a rule', () => {
    expect(
      impersonationDenialReason('GET', '/api/auth/tiktok/abc/secret?reveal=1'),
    ).not.toBeNull();
    expect(
      impersonationDenialReason('get', '/api/auth/tiktok/abc/secret/'),
    ).not.toBeNull();
  });

  it('does not block a different route that merely shares a prefix', () => {
    expect(
      impersonationDenialReason('GET', '/api/auth/tiktok/abc/secret/extra'),
    ).toBeNull();
    expect(
      impersonationDenialReason('DELETE', '/api/auth/sessions/a/b'),
    ).toBeNull();
  });
});
