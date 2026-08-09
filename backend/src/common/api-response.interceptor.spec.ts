import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';

function context(sent = false): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ sent }),
    }),
  } as unknown as ExecutionContext;
}

function next(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor();

  it('keeps established success envelopes unchanged', async () => {
    const response = { success: true, data: { id: 'page-id' } };

    await expect(
      lastValueFrom(interceptor.intercept(context(), next(response))),
    ).resolves.toBe(response);
  });

  it('adds the internal envelope while retaining legacy object fields', async () => {
    await expect(
      lastValueFrom(
        interceptor.intercept(
          context(),
          next({ authenticated: true, user: { id: 'business-id' } }),
        ),
      ),
    ).resolves.toEqual({
      success: true,
      data: { authenticated: true, user: { id: 'business-id' } },
      authenticated: true,
      user: { id: 'business-id' },
    });
  });

  it('wraps array responses without changing their data', async () => {
    await expect(
      lastValueFrom(interceptor.intercept(context(), next(['one', 'two']))),
    ).resolves.toEqual({ success: true, data: ['one', 'two'] });
  });

  it('does not alter responses already sent through the adapter', async () => {
    const response = { url: '/images/upload/file.png' };
    await expect(
      lastValueFrom(interceptor.intercept(context(true), next(response))),
    ).resolves.toBe(response);
  });
});
