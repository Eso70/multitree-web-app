export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type InternalApiSuccess<T> = {
  success: true;
  data?: T;
  message?: string;
};

export type InternalApiError = {
  success: false;
  error: ApiErrorBody;
  requestId: string;
};

export type DeveloperApiError = {
  success: false;
  error: ApiErrorBody;
  meta: {
    version: 'v1';
    requestId: string;
  };
};

type CompatibilityFields = Record<string, unknown>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Keep established top-level fields during the internal-client migration,
 * while guaranteeing that every JSON success also exposes `success` and
 * `data` consistently.
 */
export function internalSuccessEnvelope(value: unknown): unknown {
  if (isRecord(value) && value.success === true) return value;
  if (isRecord(value) && 'data' in value) return { success: true, ...value };
  if (value === undefined) return { success: true };
  if (isRecord(value)) return { success: true, data: value, ...value };
  return { success: true, data: value };
}

export function apiErrorEnvelope(
  path: string,
  statusCode: number,
  error: ApiErrorBody,
  requestId: string,
  compatibility: CompatibilityFields = {},
): InternalApiError | DeveloperApiError {
  const aliases = {
    statusCode,
    code: error.code,
    message: error.message,
    ...compatibility,
  };
  if (path.startsWith('/api/v1')) {
    return {
      success: false,
      error,
      meta: { version: 'v1', requestId },
      ...aliases,
    };
  }
  return {
    success: false,
    error,
    requestId,
    ...aliases,
  };
}
