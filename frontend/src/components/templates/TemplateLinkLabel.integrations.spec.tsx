import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinktreePresentation } from "@linktree/types";
import type { TemplateComponent } from "./types";
import { AuroraTemplate } from "./AuroraTemplate";
import { BranchSignalTemplate } from "./BranchSignalTemplate";
import { FrostTemplate } from "./FrostTemplate";
import { SerenityTemplate } from "./SerenityTemplate";
import { SpectrumTemplate } from "./SpectrumTemplate";
import { SpotlightTemplate } from "./SpotlightTemplate";

const linktree: LinktreePresentation = {
  id: "preview-static-platform-label",
  uid: "static-platform-label",
  name: "Test profile",
  subtitle: "Designer",
  description: "Profile description",
  image: "/images/DefaultAvatar.png",
  business_website_color: "#22c55e",
  footer_hidden: true,
};

const templates: Array<[string, TemplateComponent]> = [
  ["Spectrum", SpectrumTemplate],
  ["Spotlight", SpotlightTemplate],
  ["Frost", FrostTemplate],
  ["Aurora", AuroraTemplate],
  ["Serenity", SerenityTemplate],
  ["Branch Signal", BranchSignalTemplate],
];

describe("Linktree template button labels", () => {
  it.each(templates)(
    "%s keeps the small English platform name static",
    (_, Template) => {
      const { container } = render(
        <Template
          linktree={linktree}
          links={[
            {
              id: "whatsapp-link",
              platform: "whatsapp",
              url: "https://wa.me/9647502485829",
              display_name: "Editable button title",
              description: "Editable description must not replace WhatsApp",
              is_active: true,
            },
          ]}
          theme={{ from: "#111714", via: "#080b09", to: "#050706" }}
          onLinkClick={vi.fn()}
        />,
      );

      expect(screen.getByText("Editable button title")).toBeInTheDocument();
      expect(
        container.querySelector("[data-template-platform-name]"),
      ).toHaveTextContent("WhatsApp");
      expect(
        container.querySelector("[data-template-platform-name]"),
      ).toHaveClass("text-xs", "font-sans");
      expect(
        screen.queryByText("Editable description must not replace WhatsApp"),
      ).not.toBeInTheDocument();
    },
  );
});
