import { describe, expect, it } from "vitest";
import {
  encodeUploadedIconValue,
  parseUploadedIconValue,
} from "./custom-icon-value";

describe("uploaded social icon values", () => {
  it("round-trips managed transparent and opaque images", () => {
    const url = "/images/upload/businesses/acme/social-icon.png";

    expect(
      parseUploadedIconValue(
        encodeUploadedIconValue({ url, hasBackground: false }),
      ),
    ).toEqual({ url, hasBackground: false });
    expect(
      parseUploadedIconValue(
        encodeUploadedIconValue({ url, hasBackground: true }),
      ),
    ).toEqual({ url, hasBackground: true });
  });

  it("does not render external image values", () => {
    expect(
      parseUploadedIconValue(
        "uploaded-image:opaque:https://example.com/icon.png",
      ),
    ).toBeNull();
  });
});
