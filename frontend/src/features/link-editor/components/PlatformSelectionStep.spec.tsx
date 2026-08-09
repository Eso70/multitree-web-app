import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformSelectionStep } from "./PlatformSelectionStep";
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

describe("PlatformSelectionStep", () => {
  it("shows every selected platform and marks each button as selected", () => {
    render(
      <PlatformSelectionStep
        socialLinks={[
          socialLink("instagram-1", "instagram", 0),
          socialLink("youtube-1", "youtube", 1),
          socialLink("whatsapp-1", "whatsapp", 2),
        ]}
        onTogglePlatform={vi.fn()}
      />,
    );

    expect(screen.getByText("3 پلاتفۆڕم هەڵبژێردراوە")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Instagram" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "YouTube" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "WhatsApp" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Facebook" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("counts a platform once when it has multiple link instances", () => {
    render(
      <PlatformSelectionStep
        socialLinks={[
          socialLink("instagram-1", "instagram", 0),
          socialLink("instagram-2", "instagram", 1),
        ]}
        onTogglePlatform={vi.fn()}
      />,
    );

    expect(screen.getByText("1 پلاتفۆڕم هەڵبژێردراوە")).toBeInTheDocument();
  });
});
