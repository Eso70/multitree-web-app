import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TemplateSelector } from "./TemplateSelector";

const basicTemplates = new Set([
  "colorful-pills",
  "mobile-spotlight",
]);

vi.mock("@/hooks/useTemplateAccess", () => ({
  useTemplateAccess: () => ({
    allowedKeys: basicTemplates,
    isTemplateAllowed: (key: string) => basicTemplates.has(key),
  }),
}));

describe("TemplateSelector", () => {
  it("keeps higher-tier templates visible but locked for a Basic business", async () => {
    render(
      <TemplateSelector
        isOpen
        onClose={vi.fn()}
        selectedTemplate="colorful-pills"
        onSelectTemplate={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: /Colorful Pills/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /Frosted Outline/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Dark Card/i })).toBeDisabled();
  });
});
