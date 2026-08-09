import { loadAuthenticatedBusinessTheme } from "./business-error-theme";

describe("loadAuthenticatedBusinessTheme", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty("--business-website-color");
    document.documentElement.style.removeProperty("--business-website-css");
  });

  it("uses the signed-in business profile on dashboard error pages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          name: "Business name",
          favicon: "/business-icon.png",
          website_color: "gradient:to-r:#123456:#abcdef",
        },
      }),
    } as Response);

    const theme = await loadAuthenticatedBusinessTheme();

    // The request carries an abort signal so an error page cannot hang on a
    // stalled profile lookup; the signal itself is not worth asserting on.
    expect(fetch).toHaveBeenCalledWith("/api/auth/profile", {
      credentials: "include",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    expect(theme.websiteColor.primary).toBe("#123456");
    expect(theme.websiteColor.type).toBe("gradient");
    expect(theme.name).toBe("Business name");
    expect(theme.favicon).toBe("/business-icon.png");
    expect(
      document.documentElement.style.getPropertyValue("--business-website-color"),
    ).toBe("#123456");
  });
});
