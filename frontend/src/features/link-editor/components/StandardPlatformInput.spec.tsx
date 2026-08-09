import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  normalizeNationalPhoneInput,
  StandardPlatformInput,
} from "./StandardPlatformInput";

describe("StandardPlatformInput", () => {
  it("removes the selected prefix from the editable national number", () => {
    expect(normalizeNationalPhoneInput("+964 750 123 4567", "964")).toBe(
      "7501234567",
    );
    expect(normalizeNationalPhoneInput("0750 123 4567", "964")).toBe(
      "07501234567",
    );
  });

  it("uses Iraq by default and emits a prefix-free phone value", () => {
    const onChange = vi.fn();
    render(
      <StandardPlatformInput
        platform="whatsapp"
        value=""
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("button", { name: /\+964/ })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("0750 123 4567"), {
      target: { value: "+964 750 123 4567" },
    });
    expect(onChange).toHaveBeenCalledWith("7501234567");
  });

  it("keeps platform usernames unchanged while typing", () => {
    const onChange = vi.fn();
    render(
      <StandardPlatformInput
        platform="instagram"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText("@username یان instagram.com/username"),
      { target: { value: "@business" } },
    );
    expect(onChange).toHaveBeenCalledWith("@business");
  });

  it("keeps an invalid-value error quiet until the field is blurred", () => {
    render(
      <StandardPlatformInput
        platform="instagram"
        value="invalid value"
        onChange={vi.fn()}
        error="لینکەکە نادروستە."
        showError
      />,
    );

    expect(screen.queryByText("لینکەکە نادروستە.")).not.toBeInTheDocument();
    fireEvent.blur(
      screen.getByPlaceholderText("@username یان instagram.com/username"),
    );
    expect(screen.getByText("لینکەکە نادروستە.")).toBeInTheDocument();
  });

  it("can clear an optional platform value", () => {
    const onChange = vi.fn();
    render(
      <StandardPlatformInput
        platform="instagram"
        value="@business"
        onChange={onChange}
        showClear
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "سڕینەوەی بەها" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
