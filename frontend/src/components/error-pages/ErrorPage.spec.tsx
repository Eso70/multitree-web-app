import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorPage, ErrorPagePanel } from "./ErrorPage";
import { businessErrorTheme, MULTITREE_ERROR_THEME } from "./error-theme";
import { parseWebsiteColor } from "@/lib/utils/parse-website-color";
import { ERROR_PAGE_COPY } from "./copy";

describe("ErrorPage", () => {
  it("uses the same layout with the MultiTree theme", () => {
    const { container } = render(
      <ErrorPage
        code="404"
        title="Not found"
        description="Missing page"
        theme={MULTITREE_ERROR_THEME}
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

  it("renders 403 with a root-home action", () => {
    render(
      <ErrorPage
        {...ERROR_PAGE_COPY.forbidden}
        theme={MULTITREE_ERROR_THEME}
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
        theme={MULTITREE_ERROR_THEME}
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
        theme={MULTITREE_ERROR_THEME}
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
        theme={MULTITREE_ERROR_THEME}
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
        theme={MULTITREE_ERROR_THEME}
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
        theme={MULTITREE_ERROR_THEME}
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
