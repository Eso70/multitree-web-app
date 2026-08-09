import { BadRequestException, Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiResponseInterceptor } from './api-response.interceptor';

@Controller('contract')
class InternalContractController {
  @Get('legacy')
  legacy() {
    return { authenticated: true };
  }

  @Get('invalid')
  invalid(): never {
    throw new BadRequestException(['name must be a string']);
  }
}

@Controller('api/v1/contract')
class DeveloperContractController {
  @Get()
  success() {
    return { success: true, data: { version: 'v1' } };
  }

  @Get('invalid')
  invalid(): never {
    throw new BadRequestException({
      code: 'invalid_request',
      message: 'Request is invalid',
    });
  }
}

describe('API response HTTP boundary', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalContractController, DeveloperContractController],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('wraps a legacy internal response without removing its fields', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/contract/legacy' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      success: true,
      data: { authenticated: true },
      authenticated: true,
    });
  });

  it('serializes internal validation failures through the standard error', async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/contract/invalid' });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['name must be a string'],
      },
      statusCode: 400,
    });
  });

  it('keeps v1 success stable and versions v1 errors', async () => {
    const success = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/contract' });
    const failure = await app
      .getHttpAdapter()
      .getInstance()
      .inject({ method: 'GET', url: '/api/v1/contract/invalid' });

    expect(success.json()).toEqual({ success: true, data: { version: 'v1' } });
    expect(failure.json()).toMatchObject({
      success: false,
      error: { code: 'invalid_request', message: 'Request is invalid' },
      meta: { version: 'v1' },
      code: 'invalid_request',
      message: 'Request is invalid',
    });
  });
});
