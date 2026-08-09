import { render, screen } from "@testing-library/react";
import { ShieldCheck } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  LockedContent,
  LockedItemOverlay,
  LockedNotice,
} from "./LockedContent";

describe("LockedContent", () => {
  it("keeps unlocked content interactive without rendering a notice", () => {
    render(
      <LockedContent locked={false} description="Upgrade required">
        <button type="button">Editable content</button>
      </LockedContent>,
    );

    expect(
      screen.getByRole("button", { name: "Editable content" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides locked content from accessibility APIs and shows custom copy", () => {
    render(
      <LockedContent
        locked
        icon={ShieldCheck}
        title="Custom lock"
        description="Custom reason"
      >
        <div>Protected content</div>
      </LockedContent>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Custom lock");
    expect(screen.getByRole("status")).toHaveTextContent("Custom reason");
    expect(screen.getByText("Protected content").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("lock presentation variants", () => {
  it("renders standalone and item-level notices", () => {
    const { container } = render(
      <>
        <LockedNotice description="Standalone reason" compact />
        <div className="relative">
          <LockedItemOverlay label="Item unavailable" compact />
        </div>
      </>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Standalone reason");
    expect(screen.getByText("Item unavailable")).toBeInTheDocument();
    expect(container.querySelector(".absolute.inset-0")).toBeInTheDocument();
  });
});
