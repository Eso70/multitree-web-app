import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function host(path: string, requestId = 'request-id') {
  const reply = {
    header: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const value = {
    switchToHttp: () => ({
      getRequest: () => ({ id: requestId, url: path, headers: {} }),
      getResponse: () => reply,
    }),
  } as unknown as ArgumentsHost;
  return { host: value, reply };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  afterEach(() => jest.restoreAllMocks());

  it('normalizes validation errors for internal APIs', () => {
    const target = host('/api/auth/settings?section=profile');

    filter.catch(
      new BadRequestException(['name must be a string']),
      target.host,
    );

    expect(target.reply.status).toHaveBeenCalledWith(400);
    expect(target.reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['name must be a string'],
      },
      requestId: 'request-id',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    });
  });

  it('does not expose unexpected server error details', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const target = host('/api/linktrees');

    filter.catch(new Error('database password leaked'), target.host);

    expect(target.reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
      requestId: 'request-id',
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    });
  });

  it('sends Retry-After for actionable rate limits', () => {
    const target = host('/api/auth/login');

    filter.catch(
      new HttpException(
        { message: 'Too many attempts', retryAfter: 300 },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
      target.host,
    );

    expect(target.reply.header).toHaveBeenCalledWith('Retry-After', '300');
    expect(target.reply.status).toHaveBeenCalledWith(429);
  });

  it('preserves Fastify payload limits without exposing parser details', () => {
    const target = host('/api/linktrees/upload');

    filter.catch(
      { statusCode: 413, message: 'sensitive multipart parser details' },
      target.host,
    );

    expect(target.reply.status).toHaveBeenCalledWith(413);
    expect(target.reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Uploaded file exceeds the allowed size',
      },
      requestId: 'request-id',
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Uploaded file exceeds the allowed size',
    });
  });
});
