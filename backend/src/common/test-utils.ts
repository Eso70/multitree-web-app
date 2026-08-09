/**
 * Test-only helpers.
 *
 * `jest.Mock` defaults its argument tuple to `any[]`, so reading
 * `mock.calls[0][1]` reopens `any` in otherwise type-checked specs. These
 * readers give the recorded arguments a real type at the point of use.
 *
 * Excluded from the production build by `tsconfig.build.json`.
 */

/** All recorded call-argument tuples for a mocked function. */
export function mockCalls<TArgs extends unknown[] = unknown[]>(
  fn: unknown,
): TArgs[] {
  return (fn as jest.Mock).mock.calls as TArgs[];
}

/** The argument tuple of a single recorded call, defaulting to the first. */
export function mockCall<TArgs extends unknown[] = unknown[]>(
  fn: unknown,
  index = 0,
): TArgs {
  const calls = mockCalls<TArgs>(fn);
  const call = calls[index];
  if (!call) {
    throw new Error(
      `Expected a recorded call at index ${index}, but only ${calls.length} were made`,
    );
  }
  return call;
}

/** One positional argument of a recorded call. */
export function mockArg<T = unknown>(
  fn: unknown,
  callIndex: number,
  argIndex: number,
): T {
  return mockCall(fn, callIndex)[argIndex] as T;
}
