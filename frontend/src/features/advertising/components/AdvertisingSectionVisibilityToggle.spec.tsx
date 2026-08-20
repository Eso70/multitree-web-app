import { fireEvent, render, screen } from "@testing-library/react";
import { AdvertisingSectionVisibilityToggle } from "./AdvertisingSectionVisibilityToggle";

describe("AdvertisingSectionVisibilityToggle", () => {
  it("exposes the current state and requests the next state", () => {
    const onChange = vi.fn();
    render(
      <AdvertisingSectionVisibilityToggle checked onChange={onChange} />,
    );

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
