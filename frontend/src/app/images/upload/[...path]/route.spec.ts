import { join, resolve } from "path";
import { getUploadDirectories, resolveUploadPath } from "./upload-path";
import { __testing } from "./route";

describe("uploaded image compatibility route", () => {
  const runtimeDirectory = resolve("C:/multitree/.runtime/uploads");
  const legacyDirectory = resolve(
    "C:/multitree/frontend/public/images/upload",
  );

  it("uses the unwatched runtime directory before the legacy public directory", () => {
    expect(getUploadDirectories("C:/multitree/frontend", undefined)).toEqual([
      runtimeDirectory,
      legacyDirectory,
    ]);

    const runtimeImage = join(runtimeDirectory, "businesses", "logo.png");
    const legacyImage = join(legacyDirectory, "businesses", "logo.png");

    expect(
      resolveUploadPath(
        ["businesses", "logo.png"],
        (path) => path === runtimeImage || path === legacyImage,
        [runtimeDirectory, legacyDirectory],
      ),
    ).toBe(runtimeImage);
  });

  it("resolves a persisted legacy MultiTree URL from the renamed namespace", () => {
    const expectedPath = join(
      legacyDirectory,
      "multitree",
      "branding",
      "logo.png",
    );

    expect(
      resolveUploadPath(
        ["system", "branding", "logo.png"],
        (path) => path === expectedPath,
        [runtimeDirectory, legacyDirectory],
      ),
    ).toBe(expectedPath);
  });

  it("rejects path traversal before checking the filesystem", () => {
    expect(
      resolveUploadPath(["..", "secret.txt"], () => true, [runtimeDirectory]),
    ).toBeNull();
  });
});

describe("uploaded image content type", () => {
  const { getContentType } = __testing;

  it.each([
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["ico", "image/x-icon"],
  ])("serves .%s as %s", (extension, expected) => {
    expect(getContentType(extension)).toBe(expected);
  });

  /**
   * An SVG is a script host, and served under its own type from this origin it
   * runs as same-origin content — `nosniff` cannot help, because the type is
   * declared rather than sniffed. `validateImageUpload` refuses SVG on the way
   * in for that reason; this half must not offer a type the other half will
   * never produce.
   */
  it("never declares an uploaded file as SVG", () => {
    expect(getContentType("svg")).toBe("application/octet-stream");
    expect(getContentType("svg")).not.toContain("svg");
  });

  it.each(["html", "js", "", "exe", "php"])(
    "falls back to a non-renderable type for .%s",
    (extension) => {
      expect(getContentType(extension)).toBe("application/octet-stream");
    },
  );
});
