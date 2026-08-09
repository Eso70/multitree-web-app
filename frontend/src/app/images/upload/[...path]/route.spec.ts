import { join, resolve } from "path";
import { getUploadDirectories, resolveUploadPath } from "./upload-path";

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
