import { mockArg } from '../common/test-utils';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { SecurityAuditService } from './security-audit.service';

describe('AuditInterceptor', () => {
  it('records mutation context without storing sensitive body fields', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        eventType: 'platform.business.create',
        resourceType: 'business',
      }),
    } as unknown as Reflector;
    const audit = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as SecurityAuditService;
    const interceptor = new AuditInterceptor(reflector, audit);
    const request = {
      id: 'request-1',
      method: 'POST',
      url: '/api/platform/businesses',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      params: {},
      body: { name: 'Acme', password: 'must-not-be-audited' },
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'operator',
        name: 'Platform Operator',
        role: 'platform-admin',
      },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () =>
        of({
          data: {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Acme',
          },
        }),
    } as CallHandler;

    await lastValueFrom(interceptor.intercept(context, next));

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: 'platform-admin',
        actorLabel: 'Platform Operator',
        eventType: 'platform.business.create',
        outcome: 'success',
        resourceId: '22222222-2222-2222-2222-222222222222',
        resourceLabel: 'Acme',
        requestId: 'request-1',
        // @types/jest declares expect.objectContaining as `any`.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        metadata: expect.objectContaining({ changedFields: ['name'] }),
      }),
    );
    expect(JSON.stringify(mockArg(audit.record, 0, 0))).not.toContain(
      'must-not-be-audited',
    );
  });
});
