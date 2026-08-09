import { describe, expect, it } from "vitest";
import {
  createMiniWebsiteCertificate,
  createMiniWebsitePartner,
  createMiniWebsiteVideo,
} from "@linktree/types";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import { detectVideoPlatform, videoPlayerSource } from "./video-links";

describe("certificates, videos and partners", () => {
  it("detects supported video platforms", () => {
    expect(detectVideoPlatform("https://youtu.be/abc")).toBe("youtube");
    expect(detectVideoPlatform("https://www.tiktok.com/@a/video/1")).toBe(
      "tiktok",
    );
    expect(detectVideoPlatform("https://instagram.com/reel/abc")).toBe(
      "instagram",
    );
    expect(detectVideoPlatform("https://example.com/video")).toBe("other");
  });

  it("creates inline players for social and hosted videos", () => {
    expect(videoPlayerSource("https://youtu.be/M7lc1UVf-VE")).toMatchObject({
      kind: "iframe",
      provider: "youtube",
      aspect: "landscape",
    });
    expect(
      videoPlayerSource("https://youtube.com/shorts/M7lc1UVf-VE"),
    ).toMatchObject({
      kind: "iframe",
      provider: "youtube",
      aspect: "portrait",
    });
    expect(
      videoPlayerSource(
        "https://www.tiktok.com/@scout2015/video/6718335390845095173",
      ),
    ).toEqual(
      expect.objectContaining({
        kind: "iframe",
        provider: "tiktok",
        aspect: "portrait",
        url: expect.stringContaining("/player/v1/6718335390845095173?"),
      }),
    );
    expect(
      videoPlayerSource("https://www.instagram.com/reel/ABC_123/"),
    ).toMatchObject({
      kind: "iframe",
      provider: "instagram",
      aspect: "portrait",
      url: "https://www.instagram.com/reel/ABC_123/embed/",
    });
    expect(
      videoPlayerSource("https://www.facebook.com/example/videos/123"),
    ).toMatchObject({ kind: "iframe", provider: "facebook" });
    expect(videoPlayerSource("https://vimeo.com/76979871")).toMatchObject({
      kind: "iframe",
      provider: "vimeo",
    });
    expect(
      videoPlayerSource("https://cdn.example.com/video.mp4"),
    ).toMatchObject({ kind: "file", provider: "file" });
  });

  it("does not iframe unknown pages or insecure video URLs", () => {
    expect(videoPlayerSource("https://example.com/article")).toBeNull();
    expect(videoPlayerSource("http://example.com/video.mp4")).toBeNull();
  });

  it("validates a certificate title, issuer, and optional secure link", () => {
    const valid = {
      ...createMiniWebsiteCertificate("c-1"),
      title: "بڕوانامە",
      issuer: "دامەزراوە",
    };
    const errors = (certificate = valid) =>
      validateMiniWebsiteStep(
        {
          ...createMiniWebsiteDraft(),
          sections: [{ key: "credentials", enabled: true }],
          certificates: [certificate],
        },
        "socialLinks",
      );
    expect(errors()["certificate.0"]).toBeUndefined();
    expect(
      errors({ ...valid, verificationUrl: "http://example.com" })[
        "certificate.0"
      ],
    ).toBeTruthy();
  });

  it("requires a titled short-form video", () => {
    const video = {
      ...createMiniWebsiteVideo("v-1"),
      title: "ڤیدیۆ",
      url: "https://youtube.com/shorts/abcdefghijk",
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "shortVideos", enabled: true }],
        videos: [video],
      },
      "socialLinks",
    );
    expect(errors["video.0"]).toBeUndefined();
  });

  it("requires a partner logo and accepts an optional secure link", () => {
    const partner = {
      ...createMiniWebsitePartner("p-1"),
      image: "/images/upload/brand.png",
      url: "https://brand.example",
    };
    const errors = validateMiniWebsiteStep(
      {
        ...createMiniWebsiteDraft(),
        sections: [{ key: "partners", enabled: true }],
        partners: [partner],
      },
      "socialLinks",
    );
    expect(errors["partner.0"]).toBeUndefined();
  });
});
