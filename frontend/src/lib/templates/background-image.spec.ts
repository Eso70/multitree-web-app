import { describe, expect, it } from "vitest";
import {
  backgroundImageCss,
  isBackgroundImageUrl,
  readBackgroundImage,
} from "./background-image";

const UPLOAD = "/images/upload/businesses/acme/linktrees/menu/background-image/photo-1.png";

describe("isBackgroundImageUrl", () => {
  it("accepts an uploaded same-origin path", () => {
    expect(isBackgroundImageUrl(UPLOAD)).toBe(true);
  });

  it.each([
    ["an absolute third-party URL", "https://evil.example/x.png"],
    ["a protocol-relative URL", "//evil.example/x.png"],
    ["another same-origin path", "/api/v1/linktrees"],
    ["a CSS url() breakout", '/images/upload/x.png") , url("https://evil.example/x.png'],
    ["an embedded quote", '/images/upload/x".png'],
    ["a value with whitespace", "/images/upload/a b.png"],
    ["a parent-directory escape", "/images/upload/../../etc/passwd"],
    ["a data URL", "data:image/png;base64,AAAA"],
    ["an empty string", ""],
  ])("rejects %s", (_label, value) => {
    expect(isBackgroundImageUrl(value)).toBe(false);
  });

  it.each([[null], [undefined], [42], [{}], [[UPLOAD]]])(
    "rejects the non-string %s",
    (value) => {
      expect(isBackgroundImageUrl(value)).toBe(false);
    },
  );
});

describe("readBackgroundImage", () => {
  it("returns a stored upload path", () => {
    expect(readBackgroundImage({ background_image: UPLOAD })).toBe(UPLOAD);
  });

  it("returns null when the stored value is not an upload path", () => {
    expect(readBackgroundImage({ background_image: "https://evil.example/x.png" })).toBeNull();
  });

  it.each([
    ["a config without the key", { templateKey: "spectrum" }],
    ["an explicit null", { background_image: null }],
    ["a non-object", "background"],
    ["an array", [UPLOAD]],
    ["null", null],
  ])("returns null for %s", (_label, config) => {
    expect(readBackgroundImage(config)).toBeNull();
  });
});

describe("backgroundImageCss", () => {
  it("paints the upload full-bleed", () => {
    expect(backgroundImageCss(UPLOAD)).toBe(`url("${UPLOAD}") center / cover no-repeat`);
  });
});
