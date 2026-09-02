import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./clipboard";

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);
const originalExecCommand = Object.getOwnPropertyDescriptor(
  document,
  "execCommand",
);

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
    if (originalExecCommand) {
      Object.defineProperty(document, "execCommand", originalExecCommand);
    } else {
      Reflect.deleteProperty(document, "execCommand");
    }
  });

  it("falls back when the modern clipboard API is rejected", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Not allowed")),
      },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    await expect(copyToClipboard("https://example.test/invite")).resolves.toBe(
      true,
    );
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });
});
