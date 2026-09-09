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
        text: async () => '<svg><path fill="#25F4EE" /></svg>',
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
