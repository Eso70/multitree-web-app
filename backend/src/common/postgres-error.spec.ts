import {
  PostgresErrorCode,
  getPostgresErrorCode,
  isPostgresErrorCode,
  isUniqueViolation,
} from './postgres-error';

describe('postgres-error', () => {
  describe('getPostgresErrorCode', () => {
    it('reads a string code off an error-like object', () => {
      expect(getPostgresErrorCode({ code: '23505' })).toBe('23505');
    });

    it('reads the code off a real Error carrying one', () => {
      const error = Object.assign(new Error('duplicate key'), {
        code: '23505',
      });
      expect(getPostgresErrorCode(error)).toBe('23505');
    });

    it.each([[null], [undefined], ['23505'], [42], [{}], [{ code: 23505 }]])(
      'returns undefined for %p',
      (input) => {
        expect(getPostgresErrorCode(input)).toBeUndefined();
      },
    );
  });

  describe('isUniqueViolation', () => {
    it('matches SQLSTATE 23505', () => {
      expect(isUniqueViolation({ code: '23505' })).toBe(true);
    });

    it('rejects other codes and non-errors', () => {
      expect(isUniqueViolation({ code: '23503' })).toBe(false);
      expect(isUniqueViolation(new Error('boom'))).toBe(false);
      expect(isUniqueViolation(null)).toBe(false);
    });
  });

  describe('isPostgresErrorCode', () => {
    it('matches the requested code only', () => {
      const error = { code: PostgresErrorCode.ForeignKeyViolation };
      expect(
        isPostgresErrorCode(error, PostgresErrorCode.ForeignKeyViolation),
      ).toBe(true);
      expect(
        isPostgresErrorCode(error, PostgresErrorCode.UniqueViolation),
      ).toBe(false);
    });
  });
});
