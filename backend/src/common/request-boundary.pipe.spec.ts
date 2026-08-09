import { BadRequestException } from '@nestjs/common';
import { RequestBoundaryPipe } from './request-boundary.pipe';

describe('RequestBoundaryPipe', () => {
  const pipe = new RequestBoundaryPipe();

  it('rejects malformed UUID route parameters', () => {
    expect(() =>
      pipe.transform('not-a-uuid', {
        type: 'param',
        data: 'pageId',
        metatype: String,
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts numeric audit IDs and rejects unsafe generic IDs', () => {
    expect(
      pipe.transform('123', {
        type: 'param',
        data: 'auditId',
        metatype: String,
      }),
    ).toBe('123');
    expect(() =>
      pipe.transform('../bad', {
        type: 'param',
        data: 'auditId',
        metatype: String,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-UUID generic resource IDs', () => {
    expect(() =>
      pipe.transform('123', {
        type: 'param',
        data: 'id',
        metatype: String,
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts valid UUIDs and bounded pagination', () => {
    expect(
      pipe.transform('11111111-1111-4111-8111-111111111111', {
        type: 'param',
        data: 'pageId',
        metatype: String,
      }),
    ).toBe('11111111-1111-4111-8111-111111111111');
    expect(
      pipe.transform('50', { type: 'query', data: 'limit', metatype: String }),
    ).toBe('50');
    expect(
      pipe.transform(undefined, {
        type: 'query',
        data: 'limit',
        metatype: String,
      }),
    ).toBeUndefined();
  });

  it('rejects malformed UUID query parameters', () => {
    expect(() =>
      pipe.transform('not-a-uuid', {
        type: 'query',
        data: 'pageId',
        metatype: String,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid or excessive pagination', () => {
    expect(() =>
      pipe.transform('0', { type: 'query', data: 'limit', metatype: String }),
    ).toThrow(BadRequestException);
    expect(() =>
      pipe.transform('501', { type: 'query', data: 'limit', metatype: String }),
    ).toThrow(BadRequestException);
    expect(() =>
      pipe.transform('abc', { type: 'query', data: 'days', metatype: String }),
    ).toThrow(BadRequestException);
  });

  it('rejects malformed date query parameters', () => {
    expect(() =>
      pipe.transform('not-a-date', {
        type: 'query',
        data: 'from',
        metatype: String,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid enum query parameters', () => {
    expect(() =>
      pipe.transform('website', {
        type: 'query',
        data: 'pageType',
        metatype: String,
      }),
    ).toThrow(BadRequestException);
  });
});
