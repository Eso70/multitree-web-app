import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClientLinktreeAccessController } from './client-linktree-access.controller';

describe('ClientLinktreeAccessController cookie policy', () => {
  const expiresAt = new Date('2026-08-29T12:00:00.000Z');
  const access = {
    exchange: jest.fn(async () => ({
      sessionToken: 'raw-session-token',
      expiresAt,
    })),
  };
  const controller = new ClientLinktreeAccessController(
    access as never,
    { get: jest.fn(() => 'production') } as never,
    {} as never,
  );

  it('issues a secure, HttpOnly, path-scoped guest cookie', async () => {
    const setCookie = jest.fn();
    const request = {
      id: 'request-1',
      ip: '203.0.113.5',
      headers: { 'user-agent': 'test-agent' },
    } as unknown as FastifyRequest;

    await controller.exchange(
      { token: 'a'.repeat(43), pin: '123456' },
      request,
      { setCookie } as unknown as FastifyReply,
    );

    expect(setCookie).toHaveBeenCalledWith(
      'client_linktree_session',
      'raw-session-token',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/client-linktree-access',
        expires: expiresAt,
      },
    );
  });
});
