import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  LinktreePresentation,
  LinktreePresentationLink,
} from "@linktree/types";
import { BranchSignalTemplate } from "./BranchSignalTemplate";

const linktree: LinktreePresentation = {
  id: "preview-branch-signal",
  uid: "branch-signal",
  name: "Ari Network",
  subtitle: "Digital Product Designer",
  description: "Building connected digital identities.",
  image: "/images/DefaultAvatar.png",
  business_website_color: "#22c55e",
  footer_text: "Ari Network",
  footer_phone: "+9647502485829",
  footer_hidden: false,
};

const links: LinktreePresentationLink[] = [
  {
    id: "whatsapp-link",
    platform: "whatsapp",
    url: "https://wa.me/9647502485829",
    display_name: "WhatsApp",
    description: "Start a conversation",
    is_active: true,
  },
  {
    id: "website-link",
    platform: "custom",
    url: "https://example.com",
    display_name: "Website",
    description: "Explore selected work",
    is_active: true,
  },
];

describe("BranchSignalTemplate", () => {
  it("connects real profile and link data with the tenant accent", () => {
    const onLinkClick = vi.fn();
    const { container } = render(
      <BranchSignalTemplate
        linktree={linktree}
        links={links}
        theme={{ from: "#111714", via: "#080b09", to: "#050706" }}
        onLinkClick={onLinkClick}
      />,
    );

    expect(screen.getByRole("heading", { name: "Ari Network" })).toBeVisible();
    expect(screen.getByText("Digital Product Designer")).toBeVisible();
    expect(
      screen.getByText("Building connected digital identities."),
    ).toBeVisible();
    expect(screen.queryByText("Start a conversation")).not.toBeInTheDocument();
    expect(screen.queryByText("Explore selected work")).not.toBeInTheDocument();
    const platformNames = container.querySelectorAll(
      "[data-template-platform-name]",
    );
    expect(platformNames).toHaveLength(2);
    expect(platformNames[0]).toHaveTextContent("WhatsApp");
    expect(platformNames[1]).toHaveTextContent("Link");
    expect(screen.getByRole("button", { name: "WhatsApp" })).toHaveStyle({
      color: "#f7faf8",
      background:
        "linear-gradient(145deg, rgba(24, 31, 27, 0.94), rgba(10, 14, 12, 0.9))",
    });
    expect(container.querySelector('[data-branch-side="left"]')).toBeTruthy();
    expect(container.querySelector('[data-branch-side="right"]')).toBeTruthy();
    expect(
      container.querySelector('[data-signal-connector="right"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-signal-connector="left"]'),
    ).toBeNull();
    expect(container.querySelectorAll("[data-signal-connector]")).toHaveLength(
      links.length - 1,
    );
    expect(
      container
        .querySelector('[data-signal-connector="right"] path')
        ?.getAttribute("d"),
    ).toBe("M 24 -4 C 24 15, 76 23, 76 44");
    expect(
      container.querySelector<HTMLElement>("[data-template-viewport-layout]"),
    ).toHaveStyle({ "--branch-signal-accent": "#22c55e" });

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(onLinkClick).toHaveBeenCalledWith(
      "whatsapp-link",
      "https://wa.me/9647502485829",
      "whatsapp",
      undefined,
    );
  });

  it("omits inactive links and template-external controls", () => {
    render(
      <BranchSignalTemplate
        linktree={linktree}
        links={[...links, { ...links[0], id: "inactive", is_active: false }]}
        theme={{ from: "#111714", via: "#080b09", to: "#050706" }}
        onLinkClick={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button", { name: "WhatsApp" })).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /share/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /theme/i }),
    ).not.toBeInTheDocument();
  });

  it("uses the shared profile sizing and typography", () => {
    const { container } = render(
      <BranchSignalTemplate
        linktree={linktree}
        links={links}
        theme={{ from: "#111714", via: "#080b09", to: "#050706" }}
        onLinkClick={vi.fn()}
      />,
    );

    const header = container.querySelector("[data-template-avatar-header]");
    const avatar = header?.querySelector("img")?.parentElement;
    const name = screen.getByRole("heading", { name: "Ari Network" });
    const subtitle = screen.getByText("Digital Product Designer");
    const description = screen.getByText(
      "Building connected digital identities.",
    );

    expect(header?.firstElementChild).toHaveClass("gap-4", "text-center");
    expect(avatar).toHaveClass("h-28", "w-28");
    expect(header?.querySelector("[data-avatar-signal-glow]")).toHaveClass(
      "z-0",
    );
    expect(name.parentElement).toHaveClass("relative", "z-20");
    expect(name).toHaveClass("text-3xl", "font-bold", "leading-tight");
    expect(subtitle).toHaveClass("text-base", "font-medium", "leading-snug");
    expect(description).toHaveClass("text-sm", "leading-relaxed");
  });

  it("expands ambient decoration across real tablet and desktop viewports", () => {
    const { container } = render(
      <BranchSignalTemplate
        linktree={{ ...linktree, id: "public-branch-signal" }}
        links={links}
        theme={{ from: "#111714", via: "#080b09", to: "#050706" }}
        onLinkClick={vi.fn()}
      />,
    );

    const backdrop = container.querySelector("[data-signal-backdrop]");
    expect(backdrop).toHaveClass("fixed", "inset-0", "overflow-hidden");
    expect(backdrop?.firstElementChild).toHaveClass(
      "sm:size-96",
      "md:size-[28rem]",
      "lg:size-[32rem]",
    );
  });

  it("uses shared backgrounds, patterns, and readable profile text", () => {
    const { container } = render(
      <BranchSignalTemplate
        linktree={linktree}
        links={links}
        theme={{
          from: "#ffffff",
          via: "#ffffff",
          to: "#ffffff",
          isSolid: true,
          backgroundPattern: "dots",
        }}
        onLinkClick={vi.fn()}
      />,
    );

    const viewport = container.querySelector<HTMLElement>(
      "[data-template-viewport-layout]",
    );
    expect(viewport).toHaveStyle({ background: "#ffffff" });
    expect(
      container.querySelector('[data-background-pattern="dots"]'),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ari Network" })).toHaveStyle({
      color: "#1f2937",
    });
    expect(
      screen.getByText("Building connected digital identities."),
    ).toHaveStyle({ color: "rgba(31, 41, 55, 0.7)" });
    expect(screen.getByRole("button", { name: "WhatsApp" })).toHaveStyle({
      color: "#1f2937",
      background:
        "linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 249, 0.9))",
    });
    expect(
      container.querySelector("[data-template-platform-name]"),
    ).toHaveStyle({
      color: "rgba(31, 41, 55, 0.58)",
    });
  });

  it.each([
    "grid",
    "grid45",
    "dots",
    "diagonal",
    "cross",
    "circles",
    "waves",
    "zigzag",
  ] as const)(
    "renders the saved %s background pattern",
    (backgroundPattern) => {
      const { container } = render(
        <BranchSignalTemplate
          linktree={linktree}
          links={links}
          theme={{
            from: "#111714",
            via: "#080b09",
            to: "#050706",
            backgroundPattern,
          }}
          onLinkClick={vi.fn()}
        />,
      );

      expect(
        container.querySelector(
          `[data-background-pattern="${backgroundPattern}"]`,
        ),
      ).toBeTruthy();
    },
  );
});
