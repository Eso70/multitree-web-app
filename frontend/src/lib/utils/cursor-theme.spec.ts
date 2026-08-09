import { applyCursorColor, resetCursorColor } from "./cursor-theme";

describe("cursor theme", () => {
  afterEach(() => {
    resetCursorColor();
    vi.unstubAllGlobals();
  });

  it("tints both cursor assets with the active accent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        text: async () => '<svg><path fill="#b6f20d" /></svg>',
      }),
    );

    await applyCursorColor("#123456");

    expect(
      document.documentElement.style.getPropertyValue("--custom-cursor-default"),
    ).toContain("%23123456");
    expect(
      document.documentElement.style.getPropertyValue("--custom-cursor-text"),
    ).toContain("%23123456");
  });
});
