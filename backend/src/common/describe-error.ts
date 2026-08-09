/**
 * Reduces an unknown thrown value to a safe log message.
 *
 * `catch` binds `unknown`, and template-stringifying that directly yields
 * `[object Object]` for non-Error throws. Every call site needs the same
 * narrowing, so it lives here once.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error) ?? 'unknown error';
  } catch {
    // Circular structures and BigInt values make JSON.stringify throw.
    return 'unknown error';
  }
}
