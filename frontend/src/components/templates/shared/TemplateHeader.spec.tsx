import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateHeader } from "./TemplateHeader";

describe("TemplateHeader", () => {
  it("renders the role beneath the name using the secondary color", () => {
    render(
      <TemplateHeader
        name="Ahmed Bakr"
        subtitle="CEO of MultiTree"
        description="Contact me through the links below"
        textColor="#111111"
        textSecondaryColor="#64748b"
      />,
    );

    const name = screen.getByRole("heading", { name: "Ahmed Bakr" });
    const subtitle = screen.getByText("CEO of MultiTree");

    expect(
      name.compareDocumentPosition(subtitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(name).toHaveStyle({ color: "#111111" });
    expect(subtitle).toHaveStyle({ color: "#64748b" });
  });
});
