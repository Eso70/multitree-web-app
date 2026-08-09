/** Creates an identifier in browsers, secure contexts, workers, and Node runtimes. */
export function createRuntimeId(prefix = ""): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    try {
      return `${prefix}${cryptoApi.randomUUID()}`;
    } catch {
      // Some older browsers expose randomUUID without supporting the call.
    }
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${prefix}${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  // Last resort, for a runtime with no Web Crypto at all — which includes a
  // page served over plain HTTP in some browsers. Still shaped as a v4 UUID:
  // this value becomes `analytics_events.event_id`, which is a `uuid` column,
  // so a friendlier-looking random string is rejected by the database rather
  // than stored. `Math.random` is not cryptographically strong, but this id
  // only has to be unique, and an id that cannot be stored is worse.
  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
