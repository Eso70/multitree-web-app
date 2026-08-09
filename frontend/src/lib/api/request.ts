export type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly retryAfter?: string;
  readonly payload?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      details?: unknown;
      requestId?: string;
      retryAfter?: string;
      payload?: unknown;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
    this.retryAfter = options.retryAfter;
    this.payload = options.payload;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  json?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error || isRecord(error)) && error.name === "AbortError"
  );
}

function errorPayload(payload: unknown): ApiErrorPayload {
  if (!isRecord(payload)) return {};
  const nested = isRecord(payload.error) ? payload.error : {};
  const rawMessage = nested.message ?? payload.message;
  return {
    code:
      typeof nested.code === "string"
        ? nested.code
        : typeof payload.code === "string"
          ? payload.code
          : undefined,
    message: Array.isArray(rawMessage)
      ? rawMessage.filter((item) => typeof item === "string").join(", ")
      : typeof rawMessage === "string"
        ? rawMessage
        : undefined,
    details: nested.details ?? payload.details,
  };
}

function requestId(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.requestId === "string") return payload.requestId;
  return isRecord(payload.meta) && typeof payload.meta.requestId === "string"
    ? payload.meta.requestId
    : undefined;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  return response.json().catch(() => undefined);
}

export async function apiRequest<T>(
  input: RequestInfo | URL,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { json, body, headers: initialHeaders, ...init } = options;
  const headers = new Headers(initialHeaders);
  const requestBody = json === undefined ? body : JSON.stringify(json);
  if (json !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(input, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers,
      body: requestBody,
    });
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ApiRequestError("The request could not be completed", {
      status: 0,
      code: "NETWORK_ERROR",
      cause,
    });
  }

  const payload = await readPayload(response);
  const failedEnvelope = isRecord(payload) && payload.success === false;
  if (!response.ok || failedEnvelope) {
    const error = errorPayload(payload);
    throw new ApiRequestError(
      error.message ||
        response.statusText ||
        "The request could not be completed",
      {
        status: response.status,
        code: error.code || `HTTP_${response.status}`,
        details: error.details,
        requestId: requestId(payload),
        retryAfter: response.headers?.get("retry-after") || undefined,
        payload,
      },
    );
  }

  if (isRecord(payload) && "data" in payload) return payload.data as T;
  return payload as T;
}

export function isApiRequestError(
  error: unknown,
  status?: number,
): error is ApiRequestError {
  return (
    error instanceof ApiRequestError &&
    (status === undefined || error.status === status)
  );
}
