/**
 * Coerces an untrusted value into text.
 *
 * Client payloads arrive as `Record<string, unknown>`, so a field the API
 * expects to be a string can actually be an object or an array. `String(value)`
 * turns those into `"[object Object]"`, which then gets persisted and rendered
 * on a public page. Anything that is not a primitive falls back instead.
 *
 * The `value || fallback` step is deliberate: it preserves the behaviour of the
 * `String(value || fallback)` expressions this replaces, where falsy values
 * (`0`, `''`, `null`, `undefined`, `false`) resolve to the fallback.
 */
/**
 * Narrows an untrusted value to a plain object.
 *
 * `Array.isArray` and a bare `typeof x === 'object'` both leave the element
 * type as `any`, which silently reopens every field. Non-objects, arrays, and
 * `null` all collapse to an empty record.
 */
export function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

/** Narrows an untrusted value to an array of plain objects. */
export function toRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(toRecord) : [];
}

export function toText(value: unknown, fallback = ''): string {
  const candidate: unknown = value || fallback;

  if (typeof candidate === 'string') {
    return candidate;
  }
  if (typeof candidate === 'number') {
    return Number.isFinite(candidate) ? String(candidate) : fallback;
  }
  if (typeof candidate === 'bigint' || typeof candidate === 'boolean') {
    return String(candidate);
  }
  return fallback;
}
