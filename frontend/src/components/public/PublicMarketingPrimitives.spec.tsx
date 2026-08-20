import { render, screen } from "@testing-library/react";
import { PublicCallToActionSection } from "./PublicCallToActionSection";
import { PublicMarketingHero } from "./PublicMarketingHero";
import { PublicSection } from "./PublicSection";
import { PublicSectionHeading } from "./PublicSectionHeading";

describe("public marketing primitives", () => {
  it("renders customized hero content through the shared business presentation", () => {
    render(
      <PublicMarketingHero
        accentColor="#b6f20d"
        title="MultiTree hero"
        description="MultiTree description"
        primaryAction={{ label: "Create", href: "/signup" }}
        secondaryAction={{ label: "Preview", href: "#preview" }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "MultiTree hero",
    );
    expect(screen.getByRole("link", { name: "Create" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(screen.getByRole("link", { name: "Preview" })).toHaveAttribute(
      "href",
      "#preview",
    );
  });

  it("provides one responsive section and heading structure", () => {
    render(
      <PublicSection id="shared-section" label="Shared section">
        <PublicSectionHeading
          id="shared-heading"
          eyebrow="Label"
          title="Shared heading"
          description="Shared description"
        />
      </PublicSection>,
    );

    expect(screen.getByRole("region", { name: "Shared section" })).toHaveAttribute(
      "dir",
      "rtl",
    );
    expect(screen.getByRole("heading", { name: "Shared heading" })).toHaveAttribute(
      "id",
      "shared-heading",
    );
  });

  it("supports customized internal and external CTA actions", () => {
    render(
      <PublicCallToActionSection
        accentColor="#b6f20d"
        accentInk="#111827"
        title="Ready"
        description="Start now"
        primaryAction={{
          label: "WhatsApp",
          href: "https://wa.me/1",
          external: true,
        }}
        secondaryAction={{ label: "Sign in", href: "/login" }}
      />,
    );

    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
