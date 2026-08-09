import { describe, expect, it } from "vitest";
import {
  createMiniWebsiteVideo,
  createMiniWebsiteYoutubeVideo,
} from "@linktree/types";
import { ensureEnabledSectionDefaults } from "./section-defaults";
import { getSectionCountLabel } from "./section-count";
import { createMiniWebsiteDraft } from "./types";
import { validateMiniWebsiteStep } from "./validation";
import { isShortFormVideoUrl, isYoutubeStandardVideoUrl } from "./video-links";

describe("YouTube videos and social reels", () => {
  it("separates standard YouTube videos from short-form links", () => {
    expect(
      isYoutubeStandardVideoUrl("https://www.youtube.com/watch?v=abcdefghijk"),
    ).toBe(true);
    expect(
      isYoutubeStandardVideoUrl("https://www.youtube.com/shorts/abcdefghijk"),
    ).toBe(false);
    expect(isShortFormVideoUrl("https://youtube.com/shorts/abcdefghijk")).toBe(
      true,
    );
    expect(
      isShortFormVideoUrl("https://www.instagram.com/reel/AbCdEfGhIjK/"),
    ).toBe(true);
    expect(
      isShortFormVideoUrl(
        "https://www.tiktok.com/@creator/video/7460123456789012345",
      ),
    ).toBe(true);
    expect(
      isShortFormVideoUrl("https://www.youtube.com/watch?v=abcdefghijk"),
    ).toBe(false);
    expect(
      isShortFormVideoUrl("https://www.instagram.com/p/AbCdEfGhIjK/"),
    ).toBe(false);
  });

  it("accepts unique standard YouTube videos and rejects shorts or duplicates", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "youtubeVideos", enabled: true }];
    draft.youtubeVideos = [
      {
        ...createMiniWebsiteYoutubeVideo("yt-1"),
        title: "Standard video",
        url: "https://youtube.com/watch?v=abcdefghijk",
      },
    ];

    expect(validateMiniWebsiteStep(draft, "socialLinks")).toEqual({});

    draft.youtubeVideos.push({
      ...createMiniWebsiteYoutubeVideo("yt-2"),
      title: "Duplicate",
      url: "https://youtube.com/watch?v=abcdefghijk",
    });
    expect(
      validateMiniWebsiteStep(draft, "socialLinks")["youtubeVideo.1"],
    ).toBeTruthy();

    draft.youtubeVideos[1].url = "https://youtube.com/shorts/zyxwvutsrqp";
    expect(
      validateMiniWebsiteStep(draft, "socialLinks")["youtubeVideo.1"],
    ).toBeTruthy();
  });

  it("accepts a YouTube Short in reels and rejects a long YouTube video", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [{ key: "shortVideos", enabled: true }];
    draft.videos = [
      {
        ...createMiniWebsiteVideo("short-1"),
        title: "Short",
        url: "https://youtube.com/shorts/abcdefghijk",
      },
    ];

    expect(validateMiniWebsiteStep(draft, "socialLinks")).toEqual({});

    draft.videos[0].url = "https://youtube.com/watch?v=abcdefghijk";
    expect(
      validateMiniWebsiteStep(draft, "socialLinks")["video.0"],
    ).toBeTruthy();
  });

  it("creates independent defaults and reports the three-video limit", () => {
    const draft = createMiniWebsiteDraft();
    draft.sections = [
      { key: "shortVideos", enabled: true },
      { key: "youtubeVideos", enabled: true },
    ];

    const initialized = ensureEnabledSectionDefaults(draft);

    expect(initialized.videos).toHaveLength(1);
    expect(initialized.youtubeVideos).toHaveLength(1);
    expect(initialized.videos[0].id).not.toBe(initialized.youtubeVideos[0].id);
    expect(getSectionCountLabel(initialized, "youtubeVideos")).toBe("1 / 3");
  });
});
