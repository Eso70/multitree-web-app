import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorPage, ErrorPagePanel } from "./ErrorPage";
import {
  businessErrorTheme,
  SPONSOR_KRD_ERROR_THEME,
  platformErrorTheme,
} from "./error-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { ERROR_PAGE_COPY } from "./copy";

describe("platformErrorTheme branding", () => {
  /**
   * The console holds its branding as `logo: null` until platform settings
   * supply one. A parameter default only covers `undefined`, so that null used
   * to reach the shared navbar, which substitutes the neutral *business*
   * placeholder — the one thing platform chrome must never show.
   */
  it("falls back to the SponsorKrd mark for a null logo, not only a missing one", () => {
    expect(platformErrorTheme({ name: "Sponsor.krd", logo: null }).logo).toBe(
      platformErrorTheme().logo,
    );
    expect(platformErrorTheme({ logo: null }).logo).toBeTruthy();
  });

  it("falls back to the Sponsor.krd name for a null name", () => {
    expect(platformErrorTheme({ name: null }).name).toBe("Sponsor.krd");
  });

  it("still prefers a configured platform logo", () => {
    expect(
      platformErrorTheme({ logo: "/images/upload/platform.png" }).logo,
    ).toBe("/images/upload/platform.png");
  });
});

describe("ErrorPage", () => {
  it("uses the same layout with the SponsorKrd theme", () => {
    const { container } = render(
      <ErrorPage
        code="404"
        title="Not found"
        description="Missing page"
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toHaveClass(
      "rounded-2xl",
    );
    expect(
      screen.queryByRole("button", { name: "هەوڵ بدەوە" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(container.querySelector("section")).toHaveClass("min-h-[100svh]");
  });

  it("uses the same layout with a business theme and retry action", () => {
    const onReset = vi.fn();
    const theme = businessErrorTheme({
      websiteColor: parseWebsiteColor("#123456"),
      favicon: null,
      logo: null,
      name: "Business",
      subdomain: "business",
    });

    render(
      <ErrorPage
        code="500"
        title="Test error"
        description="Test description"
        theme={theme}
        homeHref="/"
        errorDigest="digest-123"
        onReset={onReset}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Test error" }),
    ).toHaveStyle({ color: "#123456" });
    expect(screen.getByText(/digest-123/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("link", { name: /login/i }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "هەوڵ بدەوە" }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("reuses the business shell for platform-admin errors", () => {
    const { container } = render(
      <ErrorPage
        {...ERROR_PAGE_COPY.serviceUnavailable}
        theme={platformErrorTheme({ name: "SponsorKrd Control" })}
        homeHref="/"
        showRetry
      />,
    );

    expect(screen.getAllByText("SponsorKrd Control").length).toBeGreaterThan(0);
    expect(container.querySelector("main")).toHaveClass("dark:bg-[#0b0d0e]");
    expect(
      screen.getByRole("button", { name: "هەوڵ بدەوە" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "هەژمار دروست بکە" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the business, platform, and SponsorKrd grid structure identical", () => {
    const business = render(
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={businessErrorTheme({
          websiteColor: parseWebsiteColor("#25f4ee"),
          favicon: null,
          logo: null,
          name: "Business",
          subdomain: "business",
        })}
        homeHref="/"
      />,
    );
    const businessMainClass =
      business.container.querySelector("main")?.className;
    const businessSectionClass =
      business.container.querySelector("section")?.className;
    const businessGrid = business.container.querySelector<HTMLElement>(
      'div[style*="background-image"]',
    );
    const businessGridClass = businessGrid?.parentElement?.className;
    const businessGridBackground = businessGrid?.style.backgroundImage;
    business.unmount();

    const platform = render(
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={platformErrorTheme()}
        homeHref="/"
      />,
    );
    const platformGrid = platform.container.querySelector<HTMLElement>(
      'div[style*="background-image"]',
    );

    expect(platform.container.querySelector("main")?.className).toBe(
      businessMainClass,
    );
    expect(platform.container.querySelector("section")?.className).toBe(
      businessSectionClass,
    );
    expect(platformGrid?.parentElement?.className).toBe(businessGridClass);
    expect(platformGrid?.style.backgroundImage).toBe(businessGridBackground);
    platform.unmount();

    const sponsorKrd = render(
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
      />,
    );
    const sponsorKrdGrid = sponsorKrd.container.querySelector<HTMLElement>(
      'div[style*="background-image"]',
    );

    expect(sponsorKrd.container.querySelector("main")?.className).toBe(
      businessMainClass,
    );
    expect(sponsorKrd.container.querySelector("section")?.className).toBe(
      businessSectionClass,
    );
    expect(sponsorKrdGrid?.parentElement?.className).toBe(businessGridClass);
    expect(sponsorKrdGrid?.style.backgroundImage).toBe(businessGridBackground);
  });

  it("seats every scope's footer on the same surface as the shell", () => {
    // The footer renders outside the grid wrapper, so a scope whose footer
    // paints a different surface shows a two-tone page below the fold. That is
    // exactly how the old root-domain branch drifted.
    const surfaces = [
      businessErrorTheme({
        websiteColor: parseWebsiteColor("#25f4ee"),
        favicon: null,
        logo: null,
        name: "Business",
        subdomain: "business",
      }),
      platformErrorTheme(),
      SPONSOR_KRD_ERROR_THEME,
    ].map((theme) => {
      const view = render(
        <ErrorPage {...ERROR_PAGE_COPY.notFound} theme={theme} homeHref="/" />,
      );
      const className = view.container.querySelector("footer")?.className;
      view.unmount();
      return className;
    });

    expect(surfaces[0]).toContain("dark:bg-[#0b0d0e]");
    expect(surfaces[1]).toBe(surfaces[0]);
    expect(surfaces[2]).toBe(surfaces[0]);
  });

  it("brands the SponsorKrd and platform shells with SponsorKrd's own logo", () => {
    const sponsorKrd = render(
      <ErrorPage
        {...ERROR_PAGE_COPY.notFound}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
      />,
    );

    // A `branding` prop with no logo falls back to the neutral business
    // placeholder, which must never stand in for SponsorKrd's own chrome.
    expect(
      sponsorKrd.container.querySelector('img[src*="business-logo-placeholder"]'),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "هەژمار دروست بکە" }),
    ).toBeNull();
    sponsorKrd.unmount();

    const platform = render(
      <ErrorPage
        {...ERROR_PAGE_COPY.notFound}
        theme={platformErrorTheme()}
        homeHref="/"
      />,
    );

    expect(
      platform.container.querySelector('img[src*="business-logo-placeholder"]'),
    ).toBeNull();
  });

  it("renders 403 with a root-home action", () => {
    render(
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "403" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders 429 with the same full error layout inside a panel", () => {
    render(
      <ErrorPagePanel
        code="429"
        title="Too many requests"
        description="Try again later"
        theme={SPONSOR_KRD_ERROR_THEME}
      />,
    );

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("429");
    expect(notice).toHaveTextContent("Try again later");
    expect(screen.getByRole("heading", { level: 1, name: "429" })).toHaveClass(
      "rounded-2xl",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders 503 with a retry and root-home action", () => {
    render(
      <ErrorPage
        {...ERROR_PAGE_COPY.serviceUnavailable}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
        showRetry
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "503" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "هەوڵ بدەوە" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders 502 with retry and root-home actions", () => {
    render(
      <ErrorPage
        {...ERROR_PAGE_COPY.badGateway}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
        showRetry
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "502" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "هەوڵ بدەوە" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders 504 with retry and root-home actions", () => {
    render(
      <ErrorPage
        {...ERROR_PAGE_COPY.gatewayTimeout}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
        showRetry
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "504" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "هەوڵ بدەوە" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders 410 with only the root-home action", () => {
    render(
      <ErrorPage
        {...ERROR_PAGE_COPY.gone}
        theme={SPONSOR_KRD_ERROR_THEME}
        homeHref="/"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "410" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "هەوڵ بدەوە" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پەڕەی سەرەکی" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
