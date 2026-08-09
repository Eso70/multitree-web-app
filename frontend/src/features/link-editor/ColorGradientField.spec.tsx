import { render, screen } from "@testing-library/react";
import { ColorGradientField } from "./ColorGradientField";

describe("ColorGradientField", () => {
  it("uses the universal parser for its gradient preview", () => {
    render(
      <ColorGradientField
        value="gradient:to-tr:#112233:#aabbcc"
        isOpen={false}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        onChange={vi.fn()}
        title="Color"
        subtitle="Choose a color"
      />,
    );

    const button = screen.getByRole("button");
    const preview = button.querySelector("span");
    expect(preview?.style.background).toContain("to top right");
  });
});
