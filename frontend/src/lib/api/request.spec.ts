import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, apiRequest } from "./request";

function response(
  payload: unknown,
  options: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  } = {},
) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? "",
    headers: new Headers(options.headers),
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe("apiRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("applies shared request defaults and unwraps the M2 success envelope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ success: true, data: { id: "page-id" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ id: string }>("/api/pages")).resolves.toEqual({
      id: "page-id",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pages",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });

  it("serializes JSON and preserves caller headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/pages", {
      method: "POST",
      json: { name: "Page" },
      headers: { "X-Request-Mode": "test" },
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('{"name":"Page"}');
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(new Headers(init.headers).get("X-Request-Mode")).toBe("test");
  });

  it("exposes normalized M2 error metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed",
              details: ["name is required"],
            },
            requestId: "request-id",
          },
          { ok: false, status: 400 },
        ),
      ),
    );

    const error = await apiRequest("/api/pages").catch((cause) => cause);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: ["name is required"],
      requestId: "request-id",
    });
  });

  it("retains AbortError so hooks can ignore cancelled requests", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));

    await expect(apiRequest("/api/pages")).rejects.toBe(abort);
  });

  it("retries safe reads when the backend is briefly unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          { message: "Backend unavailable" },
          { ok: false, status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        response({ success: true, data: { id: "page-id" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ id: string }>("/api/pages")).resolves.toEqual({
      id: "page-id",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never retries mutations automatically", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(
        { message: "Backend unavailable" },
        { ok: false, status: 503 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/pages", { method: "POST", json: { name: "Page" } }),
    ).rejects.toMatchObject({ status: 503, message: "Backend unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("exposes Retry-After for contextual 429 handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          { success: false, message: "Too many requests" },
          {
            ok: false,
            status: 429,
            headers: { "Retry-After": "60" },
          },
        ),
      ),
    );

    const error = await apiRequest("/api/auth/login").catch((cause) => cause);
    expect(error).toMatchObject({ status: 429, retryAfter: "60" });
  });
});
