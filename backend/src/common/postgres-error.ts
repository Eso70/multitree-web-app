/**
 * PostgreSQL surfaces failures as `SQLSTATE` codes on the thrown error. `catch`
 * binds `unknown`, so the code has to be read through a guard rather than an
 * `any` annotation.
 *
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PostgresErrorCode = {
  UniqueViolation: '23505',
  ForeignKeyViolation: '23503',
  NotNullViolation: '23502',
  CheckViolation: '23514',
} as const;

export type PostgresErrorCodeValue =
  (typeof PostgresErrorCode)[keyof typeof PostgresErrorCode];

/** Reads the SQLSTATE code off an unknown thrown value, if it carries one. */
export function getPostgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/** True when the thrown value is a PostgreSQL error with the given SQLSTATE. */
export function isPostgresErrorCode(
  error: unknown,
  code: PostgresErrorCodeValue,
): boolean {
  return getPostgresErrorCode(error) === code;
}

/** True when the thrown value is a unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return isPostgresErrorCode(error, PostgresErrorCode.UniqueViolation);
}
