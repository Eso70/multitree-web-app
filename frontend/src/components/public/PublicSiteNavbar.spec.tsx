import { render, screen } from "@testing-library/react";
import { PublicSiteNavbar } from "./PublicSiteNavbar";

describe("PublicSiteNavbar", () => {
  it("renders caller-owned navigation with separate sign-in and sign-up actions", () => {
    render(
      <PublicSiteNavbar
        appearance="business"
        branding={{ name: "Sponsor.krd", accentColor: "#84cc16" }}
        navigationItems={[{ label: "تایبەتمەندییەکان", href: "/features" }]}
        action={{ label: "هەژمار دروست بکە", href: "/signup" }}
        actionColor="#25F4EE"
        actionInk="#111827"
        secondaryAction={{ label: "چوونەژوورەوە", href: "/login" }}
        emphasizeFirstNavItem={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "تایبەتمەندییەکان" }),
    ).toHaveAttribute("href", "/features");
    expect(
      screen.getByRole("link", { name: "هەژمار دروست بکە" }),
    ).toHaveStyle({
      "--public-navbar-action-color": "#25F4EE",
      "--public-navbar-action-ink": "#111827",
    });
    expect(
      screen.getByRole("link", { name: "چوونەژوورەوە" }),
    ).toHaveAttribute("href", "/login");
  });
});
