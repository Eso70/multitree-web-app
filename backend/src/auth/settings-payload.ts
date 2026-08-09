/**
 * Validation transforms settings JSON into a DTO instance. Depending on the
 * TypeScript class-field output, optional DTO properties can exist as own
 * properties with an `undefined` value. They were never sent by the client and
 * must not participate in authorization, approval storage, or updates.
 */
export function compactSettingsPayload(
  body: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
