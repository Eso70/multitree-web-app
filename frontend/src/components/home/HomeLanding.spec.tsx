import { render, screen, waitFor } from "@testing-library/react";
import { HomeLanding } from "./HomeLanding";

const { applyCursorColor, publicSiteNavbar } = vi.hoisted(() => ({
  applyCursorColor: vi.fn().mockResolvedValue(undefined),
  publicSiteNavbar: vi.fn(() => null),
}));

vi.mock("@/lib/utils/cursor-theme", () => ({
  applyCursorColor: (...args: unknown[]) => applyCursorColor(...args),
  resetCursorColor: vi.fn(),
}));

vi.mock("@/components/public/PublicSiteNavbar", () => ({
  PublicSiteNavbar: () => publicSiteNavbar(),
}));
vi.mock("./CustomScrollbar", () => ({ CustomScrollbar: () => null }));
describe("HomeLanding platform theme", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--sponsor-krd-accent");
    document.documentElement.style.removeProperty(
      "--sponsor-krd-accent-gradient",
    );
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("applies the platform accent returned by the public API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { accent_color: "#123456" },
          }),
          { status: 200 },
        ),
      ),
    );

    render(<HomeLanding />);

    await waitFor(() => {
      expect(
        document.documentElement.style.getPropertyValue("--sponsor-krd-accent"),
      ).toBe("#123456");
      expect(applyCursorColor).toHaveBeenCalledWith(
        "#123456",
        document.documentElement,
        expect.any(Function),
      );
    });
  });

  it("presents the advertising-account hero in the shared site chrome", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<HomeLanding />);

    expect(
      screen.getByRole("heading", { name: /بەڕێوەبردنی ڕیکلام/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/هەژمارە ڕیکلامییەکانی TikTok/)).toBeInTheDocument();
    expect(screen.getByText(/قۆناغی داهاتوودا/)).toBeInTheDocument();
    expect(publicSiteNavbar).toHaveBeenCalledOnce();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.queryByText(/10,000|1,000,000|revenue/i),
    ).not.toBeInTheDocument();
  });
});
