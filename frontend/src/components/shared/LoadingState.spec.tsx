import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "@/components/shared/LoadingState";

describe("LoadingState", () => {
  it("announces one clear operation without CSS animation utilities", () => {
    const { container } = render(
      <LoadingState
        title="Preparing your session"
        description="This should only take a moment."
      />,
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Preparing your session")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/animate-(spin|pulse|ping)/);
  });

  it("supports a compact footprint for an existing card", () => {
    const { container } = render(
      <LoadingState compact title="Checking link" />,
    );
    expect(container.firstElementChild).toHaveClass("min-h-28");
  });
});
