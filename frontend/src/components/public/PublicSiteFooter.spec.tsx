import { render, screen } from "@testing-library/react";
import { PublicSiteFooter } from "./PublicSiteFooter";

describe("PublicSiteFooter", () => {
  it("renders caller-owned branding, navigation, and footer actions", () => {
    render(
      <PublicSiteFooter
        brandName="Kurd Store"
        logo="/images/DefaultAvatar.png"
        description="پۆرتفۆلیۆی فەرمی"
        accentColor="#2563eb"
        columns={[
          {
            title: "بەشەکان",
            links: [{ label: "خزمەتگوزارییەکان", href: "#portfolio-services" }],
          },
          {
            title: "پەیوەندی",
            links: [
              {
                label: "Instagram",
                href: "https://instagram.com/kurdstore",
                external: true,
              },
            ],
          },
        ]}
        copyrightText="© 2026 Kurd Store. هەموو مافەکان پارێزراون."
        bottomLinks={[
          { label: "گەڕانەوە بۆ سەرەوە", href: "#portfolio-home" },
        ]}
        showVerifiedBadge
        verifiedLabel="پشتڕاستکراوە"
      />,
    );

    expect(screen.getByText("Kurd Store")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "پشتڕاستکراوە" }),
    ).toBeInTheDocument();
    expect(screen.getByText("پۆرتفۆلیۆی فەرمی")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "خزمەتگوزارییەکان" }),
    ).toHaveAttribute("href", "#portfolio-services");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(
      screen.getByRole("link", { name: "گەڕانەوە بۆ سەرەوە" }),
    ).toHaveAttribute("href", "#portfolio-home");
    expect(screen.getByText(/هەموو مافەکان پارێزراون/)).toBeInTheDocument();
  });
});
