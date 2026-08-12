import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  STANDARD_TEMPLATE_ACTION_LIST_CLASS,
  STANDARD_TEMPLATE_BUTTON_SIZE_CLASS,
  TemplateActionButton,
  TemplateActionButtonList,
} from "./TemplateActionButton";

describe("template action sizing", () => {
  it("uses one button height and one list spacing preset", () => {
    const { container } = render(
      <TemplateActionButtonList isEmpty={false}>
        <TemplateActionButton onClick={vi.fn()}>Contact</TemplateActionButton>
      </TemplateActionButtonList>,
    );

    expect(screen.getByRole("button", { name: "Contact" })).toHaveClass(
      ...STANDARD_TEMPLATE_BUTTON_SIZE_CLASS.split(" "),
    );
    expect(container.firstElementChild).toHaveClass(
      ...STANDARD_TEMPLATE_ACTION_LIST_CLASS.split(" "),
    );
  });
});
