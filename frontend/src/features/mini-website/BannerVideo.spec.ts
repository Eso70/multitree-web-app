import { describe, expect, it } from "vitest";
import { bannerVideoSource, youtubeEmbedUrl, youtubeVideoId } from "./BannerVideo";

describe("banner video source", () => {
  it("reads the id out of every YouTube URL shape", () => {
    const id = "xg6LQGe6Kj0";
    expect(youtubeVideoId(`https://youtu.be/${id}?si=u5JsjYtbLqxK-sm8`)).toBe(id);
    expect(youtubeVideoId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(youtubeVideoId(`https://youtube.com/shorts/${id}`)).toBe(id);
    expect(youtubeVideoId(`https://www.youtube.com/live/${id}`)).toBe(id);
    expect(youtubeVideoId(`https://www.youtube.com/embed/${id}`)).toBe(id);
  });

  it("ignores the tracking suffix on a share link", () => {
    // The `?si=` a share sheet appends must not end up inside the id.
    expect(youtubeVideoId("https://youtu.be/xg6LQGe6Kj0?si=u5JsjYtbLqxK-sm8")).toBe(
      "xg6LQGe6Kj0",
    );
  });

  it("builds a YouTube banner with the player's own controls", () => {
    const source = bannerVideoSource("https://youtu.be/xg6LQGe6Kj0?si=abc");
    expect(source?.provider).toBe("youtube");

    const url = new URL(source!.url);
    expect(url.origin + url.pathname).toBe("https://www.youtube.com/embed/xg6LQGe6Kj0");
    // Timeline, volume and fullscreen come from YouTube itself.
    expect(url.searchParams.get("controls")).toBe("1");
    // Autoplay is only permitted while muted; the viewer unmutes from the player.
    expect(url.searchParams.get("autoplay")).toBe("1");
    expect(url.searchParams.get("mute")).toBe("1");
    // `loop` does nothing on a single video unless `playlist` repeats the id.
    expect(url.searchParams.get("loop")).toBe("1");
    expect(url.searchParams.get("playlist")).toBe("xg6LQGe6Kj0");
    // iOS will not autoplay without this.
    expect(url.searchParams.get("playsinline")).toBe("1");
  });

  it("keeps Vimeo out of background mode, which would strip its controls", () => {
    const source = bannerVideoSource("https://vimeo.com/123456789");
    expect(source?.provider).toBe("vimeo");
    // `background=1` removes the control bar and hard-mutes the player.
    expect(source!.url).not.toContain("background=1");
    expect(source!.url).toContain("controls=1");
    expect(source!.url).toContain("autoplay=1");
  });

  it("treats direct media URLs as playable files", () => {
    expect(bannerVideoSource("https://cdn.example.com/clip.mp4")?.provider).toBe("file");
    expect(bannerVideoSource("https://cdn.example.com/clip.webm")?.provider).toBe("file");
  });

  it("rejects anything that is not a URL", () => {
    expect(bannerVideoSource("")).toBeNull();
    expect(bannerVideoSource("not a url")).toBeNull();
    expect(bannerVideoSource("javascript:alert(1)")).toBeNull();
  });

  it("gives the gallery a plain embed, without the banner's autoplay", () => {
    const url = youtubeEmbedUrl("https://youtu.be/xg6LQGe6Kj0");
    expect(url).toBe("https://www.youtube.com/embed/xg6LQGe6Kj0?rel=0");
    expect(url).not.toContain("autoplay");
  });
});
