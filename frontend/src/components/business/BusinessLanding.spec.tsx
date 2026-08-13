import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { BusinessLanding } from "./BusinessLanding";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: ComponentProps<"img"> & { fill?: boolean; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element -- deterministic test double for next/image
    <img {...props} alt={props.alt || ""} />
  ),
}));

vi.mock("@/components/analytics/TikTokPixel", () => ({
  TikTokPixel: () => null,
}));

vi.mock("@/components/home/CustomScrollbar", () => ({
  CustomScrollbar: () => null,
}));

vi.mock("@/lib/utils/cursor-theme", () => ({
  applyCursorColor: vi.fn().mockResolvedValue(undefined),
  resetCursorColor: vi.fn(),
}));

const business = {
  id: "business-1",
  name: "North Studio",
  subdomain: "north",
  logo: "/logo.png",
  website_color: "#2563eb",
  footer_text: "Independent design and production studio.",
  footer_phone: "+964 750 000 0000",
  whatsapp_enabled: true,
};

describe("BusinessLanding", () => {
  it("renders only customer-safe published destinations and contact details", () => {
    const { container } = render(
      <BusinessLanding
        business={{
          ...business,
          trusted_partners: [
            {
              id: "partner-1",
              name: "Partner",
              image: "/partner.png",
              url: "https://partner.example",
            },
          ],
        }}
        linktrees={[
          {
            id: "links-1",
            name: "Customer links",
            uid: "customer-links",
            subtitle: "Official contact channels",
          },
        ]}
        miniWebsites={[
          {
            id: "site-1",
            name: "Our services",
            slug: "services",
            headline: "What we provide",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "هەموو زانیارییەکانت لەناو یەک پەڕەی دیجیتاڵی",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("پێشبینینی ناوەڕۆکی گشتی"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "متمانەپێکراو لەلایەن" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous template" })).toBeInTheDocument();
    const nextTemplateButton = screen.getByRole("button", { name: "Next template" });
    expect(nextTemplateButton).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-label$="mobile preview"]')).toHaveLength(3);
    const mobileTemplateCarousel = screen.getByRole("group", {
      name: "Mobile template carousel",
    });
    const activeTemplateStatus = mobileTemplateCarousel.querySelector(
      '[aria-live="polite"]',
    );
    const initialActiveTemplate = activeTemplateStatus?.textContent;
    fireEvent.click(nextTemplateButton);
    expect(activeTemplateStatus?.textContent).not.toBe(initialActiveTemplate);
    expect(container.querySelectorAll('[aria-label$="mobile preview"]')).toHaveLength(3);
    expect(
      container.querySelector('a[href="https://partner.example"]'),
    ).toBeInTheDocument();
    const assistantInput = screen.getByLabelText("نامە بۆ MultiTree Agent");
    fireEvent.change(assistantInput, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "ناردنی نامە" }));
    expect(screen.getByText("سڵاو! 👋")).toBeInTheDocument();
    fireEvent.change(assistantInput, { target: { value: "I want a Linktree" } });
    fireEvent.click(screen.getByRole("button", { name: "ناردنی نامە" }));
    expect(
      screen.getByText(
        "بۆ لینکـتری یان ماڵپەڕی بچووک، تکایە لەگەڵ خاوەنی بیزنسەکە قسە بکە.",
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector('a[href="/linktree/customer-links"]'),
    ).toMatchObject({ target: "_blank", rel: "noopener noreferrer" });
    const linktreesTab = screen.getByRole("tab", { name: "لینکترییەکان" });
    const websitesTab = screen.getByRole("tab", {
      name: "ماڵپەڕە بچووکەکان",
    });
    expect(linktreesTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(
      screen.queryByRole("tab", { name: "Overview" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Contact" }),
    ).not.toBeInTheDocument();

    fireEvent.click(linktreesTab);
    expect(linktreesTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "لینکترییە بڵاوکراوەکان" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(linktreesTab, { key: "ArrowRight" });
    expect(websitesTab).toHaveAttribute("aria-selected", "true");
    expect(
      container.querySelector('a[href="/bio/services"][target="_blank"]'),
    ).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("heading", {
        name: "ماڵپەڕە بچووکە بڵاوکراوەکان",
      }),
    ).toBeInTheDocument();
    const themeToggle = screen.getByRole("button", {
      name: "Toggle theme mode",
    });
    fireEvent.click(themeToggle);
    expect(document.documentElement).toHaveClass("dark");
    fireEvent.click(themeToggle);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(
      screen.queryByText("Official homepage of North Studio"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Every official link, easy to find.",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Explore every side of North Studio.",
      }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/linktree/customer-links"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/bio/services"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="tel:+9647500000000"]')).toBeInTheDocument();
    expect(container.querySelector('a[href*="/business"]')).not.toBeInTheDocument();
    expect(container.querySelector('a[href*="login"]')).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard", { exact: true })).not.toBeInTheDocument();
  }, 15_000);

  it("omits unavailable public sections instead of rendering placeholders", () => {
    render(
      <BusinessLanding
        business={{
          ...business,
          footer_phone: null,
          footer_text: null,
          whatsapp_enabled: false,
        }}
        linktrees={[]}
        miniWebsites={[]}
      />,
    );

    expect(
      screen.queryByRole("heading", {
        name: "Every official link, easy to find.",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Explore every side of North Studio.",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Ready to connect with North Studio?",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(
      screen.queryByLabelText("پێشبینینی ناوەڕۆکی گشتی"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "متمانەپێکراو لەلایەن" }),
    ).not.toBeInTheDocument();
  });
});
