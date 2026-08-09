export interface UpstreamFailureResponse {
  message: "Backend unavailable" | "Gateway timeout";
  status: 503 | 504;
}

export function classifyUpstreamFailure(
  error: unknown,
): UpstreamFailureResponse {
  const timedOut =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "AbortError" || error.name === "TimeoutError");

  return timedOut
    ? { message: "Gateway timeout", status: 504 }
    : { message: "Backend unavailable", status: 503 };
}
