import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinksStep } from "./LinksStep";
import type { SocialLink } from "@/features/link-editor/types";

function socialLink(id: string, platform: string, order: number): SocialLink {
  return {
    id,
    platform,
    order,
    url: "",
    value: "",
    enabled: true,
  };
}

describe("LinksStep", () => {
  it("renders every platform instance selected in the previous step", () => {
    const links = [
      socialLink("instagram-1", "instagram", 0),
      socialLink("youtube-1", "youtube", 1),
      socialLink("whatsapp-1", "whatsapp", 2),
    ];

    render(
      <LinksStep
        selectedPlatforms={links.map((link) => link.id)}
        socialLinks={links}
        linkErrors={{}}
        onUpdateLink={vi.fn()}
        onUpdateCountryCode={vi.fn()}
        onUpdateDisplayName={vi.fn()}
        onUpdateCustomColor={vi.fn()}
        onUpdateCustomIcon={vi.fn()}
        onRemoveLink={vi.fn()}
        onAddPlatformInstance={vi.fn()}
        onMoveLink={vi.fn()}
        onBlurLink={vi.fn()}
      />,
    );

    expect(screen.getByText("3 لینک")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });
});
