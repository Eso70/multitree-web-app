import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("API proxy redirects", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns backend OAuth redirects to the browser without following them", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://accounts.google.com/o/oauth2/v2/auth" },
        }),
      );

    const response = await GET(
      new NextRequest(
        "http://localhost:3011/api/signup/google/start?invite=token",
      ),
      { params: Promise.resolve({ path: ["signup", "google", "start"] }) },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/signup/google/start?invite=token",
      expect.objectContaining({ redirect: "manual" }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
  });
});
