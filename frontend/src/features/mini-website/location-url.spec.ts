import { describe, expect, it } from "vitest";
import { coordinatesFromMapUrl, firstUrl, isShortenedMapUrl } from "./location-url";

describe("repairing a doubled link", () => {
  it("keeps only the first URL when one is concatenated with itself", () => {
    const link = "https://maps.app.goo.gl/oBdyBovy7QRL7GkE7";
    expect(firstUrl(`${link}${link}`)).toBe(link);
  });

  it("leaves a single URL untouched", () => {
    const link = "https://www.google.com/maps/place/Erbil/@36.19,44.01,15z";
    expect(firstUrl(link)).toBe(link);
    expect(firstUrl(`  ${link}  `)).toBe(link);
  });

  it("does not trim a URL that merely contains 'http' in a parameter", () => {
    const link = "https://www.google.com/maps?q=36.19,44.01";
    expect(firstUrl(link)).toBe(link);
  });
});

describe("coordinates from a pasted map link", () => {
  it("reads a Google Maps place link", () => {
    const parsed = coordinatesFromMapUrl(
      "https://www.google.com/maps/place/Erbil+Citadel/@36.1912,44.0092,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d36.1911!4d44.0091",
    );
    // The resolved place (!3d/!4d) wins over the camera position (@).
    expect(parsed).toEqual({ lat: 36.1911, lng: 44.0091, zoom: 17 });
  });

  it("reads a plain viewport link with no place data", () => {
    expect(coordinatesFromMapUrl("https://www.google.com/maps/@36.1901,44.0091,15z")).toEqual({
      lat: 36.1901,
      lng: 44.0091,
      zoom: 15,
    });
  });

  it("reads the q and ll query forms", () => {
    expect(coordinatesFromMapUrl("https://maps.google.com/?q=36.19,44.0")).toEqual({
      lat: 36.19,
      lng: 44,
    });
    expect(coordinatesFromMapUrl("https://maps.google.com/?ll=36.19,44.0")).toEqual({
      lat: 36.19,
      lng: 44,
    });
    expect(coordinatesFromMapUrl("https://maps.google.com/?q=loc:36.19,44.0")).toEqual({
      lat: 36.19,
      lng: 44,
    });
  });

  it("reads OpenStreetMap links, including the hash form", () => {
    expect(
      coordinatesFromMapUrl("https://www.openstreetmap.org/?mlat=36.19&mlon=44.01"),
    ).toEqual({ lat: 36.19, lng: 44.01 });
    expect(
      coordinatesFromMapUrl("https://www.openstreetmap.org/#map=16/36.19/44.01"),
    ).toEqual({ lat: 36.19, lng: 44.01, zoom: 16 });
  });

  it("accepts bare coordinates pasted as text", () => {
    expect(coordinatesFromMapUrl("36.1901, 44.0091")).toEqual({
      lat: 36.1901,
      lng: 44.0091,
    });
  });

  it("reads the /maps/search path a shortened Share link expands to", () => {
    // Verified against a real maps.app.goo.gl redirect: the pair lands in the
    // path, with `+` in place of the space.
    expect(
      coordinatesFromMapUrl(
        "https://www.google.com/maps/search/36.172587,+44.040189?entry=tts&g_ep=EgoyMDI2MDcyMi4wIPu8ASoASAFQAw%3D%3D",
      ),
    ).toEqual({ lat: 36.172587, lng: 44.040189 });
  });

  it("returns nothing for a shortened link, which carries no coordinates", () => {
    const short = "https://maps.app.goo.gl/xg6LQGe6Kj0";
    expect(coordinatesFromMapUrl(short)).toBeNull();
    // The editor uses this to explain why the pin did not move.
    expect(isShortenedMapUrl(short)).toBe(true);
  });

  it("rejects junk and out-of-range values", () => {
    expect(coordinatesFromMapUrl("")).toBeNull();
    expect(coordinatesFromMapUrl("not a url")).toBeNull();
    expect(coordinatesFromMapUrl("https://example.com/page")).toBeNull();
    expect(coordinatesFromMapUrl("https://maps.google.com/?q=200,400")).toBeNull();
    // 0,0 is in the Atlantic — treated as a parse artefact, not a business.
    expect(coordinatesFromMapUrl("https://maps.google.com/?q=0,0")).toBeNull();
  });

  it("clamps an absurd zoom rather than passing it through", () => {
    expect(coordinatesFromMapUrl("https://www.google.com/maps/@36.19,44.01,99z")?.zoom).toBe(20);
  });
});
