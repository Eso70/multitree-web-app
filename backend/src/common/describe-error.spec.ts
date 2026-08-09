import { describeError } from './describe-error';

describe('describeError', () => {
  it('returns the message of an Error', () => {
    expect(describeError(new Error('redis down'))).toBe('redis down');
  });

  it('returns the message of an Error subclass', () => {
    class TimeoutError extends Error {}
    expect(describeError(new TimeoutError('timed out'))).toBe('timed out');
  });

  it('returns a thrown string unchanged', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });

  it('serializes a thrown object instead of producing [object Object]', () => {
    expect(describeError({ code: 'ECONNREFUSED' })).toBe(
      '{"code":"ECONNREFUSED"}',
    );
  });

  it('falls back for values JSON cannot serialize', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeError(circular)).toBe('unknown error');
  });

  it('falls back when JSON.stringify returns undefined', () => {
    expect(describeError(undefined)).toBe('unknown error');
  });

  it('never returns [object Object]', () => {
    const values: unknown[] = [
      null,
      undefined,
      0,
      false,
      { a: 1 },
      [1, 2],
      new Error('x'),
    ];
    for (const value of values) {
      expect(describeError(value)).not.toBe('[object Object]');
    }
  });
});
