import { beforeEach, describe, expect, it } from "vitest";
import { persistAppTheme, readAppTheme } from "./app-theme";

describe("app theme persistence", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.cookie = "app-theme=; Path=/; Max-Age=0";
  });

  it("keeps DOM, local storage, and the server-readable cookie aligned", () => {
    persistAppTheme("dark");

    expect(document.documentElement).toHaveClass("dark");
    expect(readAppTheme()).toBe("dark");
    expect(document.cookie).toContain("app-theme=dark");

    persistAppTheme("light");

    expect(document.documentElement).not.toHaveClass("dark");
    expect(readAppTheme()).toBe("light");
    expect(document.cookie).toContain("app-theme=light");
  });
});
