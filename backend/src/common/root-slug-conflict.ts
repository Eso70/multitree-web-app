import { ConflictException } from '@nestjs/common';
import { PostgresErrorCode, getPostgresErrorCode } from './postgres-error';

/**
 * The constraint that decides a root-domain public URL.
 *
 * `root_public_slugs` is keyed on `(page_type, slug)`, and the database
 * triggers fill it from the page rows. That primary key is the final
 * concurrency control: two requests cannot claim the same route however they
 * raced, so the collision surfaces as a unique violation on the write rather
 * than as a failed availability check beforehand.
 */
const ROOT_SLUG_CONSTRAINT = 'root_public_slugs_pkey';

/**
 * Turns a lost race for a root-domain slug into the 409 it is.
 *
 * Every writer of a root-domain page needs this, and each surface having its
 * own copy is how the platform surfaces ended up without one: a Creator taking
 * a slug already claimed got a clear "already in use", while a platform
 * administrator doing exactly the same thing got a 500, because
 * `ApiExceptionFilter` has no mapping for a raw SQLSTATE and falls back to
 * `INTERNAL_SERVER_ERROR`.
 *
 * Only this one constraint is translated. Any other failure — including a
 * unique violation from a different constraint — is rethrown untouched rather
 * than reported to the caller as a slug conflict it is not.
 */
export function rethrowRootSlugConflict(error: unknown): never {
  // The code is read first: it rejects `null` and non-objects on its own, so
  // the constraint is only reached on a value that can carry one.
  if (
    getPostgresErrorCode(error) === PostgresErrorCode.UniqueViolation &&
    (error as { constraint?: unknown }).constraint === ROOT_SLUG_CONSTRAINT
  ) {
    throw new ConflictException('This public URL is already in use');
  }
  throw error;
}
