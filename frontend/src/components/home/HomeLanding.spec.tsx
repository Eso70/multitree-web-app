import { render, screen, waitFor } from "@testing-library/react";
import { HomeLanding } from "./HomeLanding";

const { applyCursorColor } = vi.hoisted(() => ({
  applyCursorColor: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/utils/cursor-theme", () => ({
  applyCursorColor: (...args: unknown[]) => applyCursorColor(...args),
  resetCursorColor: vi.fn(),
}));

vi.mock("@/components/public/PublicSiteNavbar", () => ({
  PublicSiteNavbar: () => null,
}));
vi.mock("./CustomScrollbar", () => ({ CustomScrollbar: () => null }));
vi.mock("@/features/communications/HomepageCommunications", () => ({
  HomepageCommunications: () => null,
}));

describe("HomeLanding platform theme", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--multitree-accent");
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
        document.documentElement.style.getPropertyValue("--multitree-accent"),
      ).toBe("#123456");
      expect(applyCursorColor).toHaveBeenCalledWith(
        "#123456",
        document.documentElement,
        expect.any(Function),
      );
    });
  });

  it("presents both public products without invented performance claims", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<HomeLanding />);

    expect(screen.getAllByText("Linktree").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mini Website").length).toBeGreaterThan(0);
    expect(screen.getByText("لە سێ هەنگاودا بڵاوی بکەرەوە")).toBeInTheDocument();
    expect(screen.queryByText(/10,000|1,000,000|revenue/i)).not.toBeInTheDocument();
  });
});
