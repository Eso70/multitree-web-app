import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthenticationPreviewPanel } from "./AuthenticationPreviewPanel";

describe("AuthenticationPreviewPanel", () => {
  it("keeps the existing platform and business titles by default", () => {
    const view = render(
      <AuthenticationPreviewPanel description="Platform description" />,
    );
    expect(
      screen.getByRole("heading", { name: "پانێڵی پلاتفۆڕم" }),
    ).toBeInTheDocument();

    view.rerender(
      <AuthenticationPreviewPanel
        description="Business description"
        brandName="Business"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "پانێڵی بزنس" }),
    ).toBeInTheDocument();
  });

  it("supports a role-specific title without forking the shared design", () => {
    render(
      <AuthenticationPreviewPanel
        description="Creator description"
        title="پانێڵی Creator"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "پانێڵی Creator" }),
    ).toBeInTheDocument();
  });
});
