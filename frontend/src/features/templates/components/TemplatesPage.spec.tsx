import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplatesPage } from "./TemplatesPage";

const { mockUseTemplateAccess } = vi.hoisted(() => ({
  mockUseTemplateAccess: vi.fn(),
}));

vi.mock("@/hooks/useTemplateAccess", () => ({
  useTemplateAccess: mockUseTemplateAccess,
}));

vi.mock("@/components/shared/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div>
      {label}: {value}
    </div>
  ),
}));

vi.mock("@/components/shared/DashboardSurface", () => ({
  DashboardSurface: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/shared/PageHeader", () => ({
  PageHeader: ({ title, action }: { title: string; action: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
}));

vi.mock("@/components/shared/SearchModal", () => ({
  SearchModal: () => null,
}));

vi.mock("@/components/templates/DynamicTemplate", () => ({
  DynamicTemplate: () => <div>Linktree preview</div>,
}));

vi.mock("./TemplatePhonePreview", () => ({
  TemplatePhonePreview: ({
    name,
    children,
  }: {
    name: string;
    children: (isNear: boolean) => ReactNode;
  }) => (
    <div>
      <span>{name}</span>
      {children(true)}
    </div>
  ),
  TemplatePreviewSkeleton: () => <div>Loading</div>,
}));

describe("TemplatesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseTemplateAccess.mockReturnValue({
      isLoading: false,
      isTemplateAllowed: () => true,
    });
  });

  it("shows the complete template-page skeleton while access is loading", () => {
    mockUseTemplateAccess.mockReturnValue({
      isLoading: true,
      isTemplateAllowed: () => false,
    });

    render(<TemplatesPage accessMode="entitlement" />);

    expect(
      screen.getByRole("status", { name: "Loading templates" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  /**
   * The page catalogues Linktree templates only. Other product templates were
   * removed from it, and with one visual template left there is nothing to
   * browse there anyway.
   */
  it("offers no template category tabs", () => {
    render(<TemplatesPage />);

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("supports the shared Creator view-only catalogue without business entitlement loading", () => {
    render(<TemplatesPage accessMode="all" />);

    expect(mockUseTemplateAccess).toHaveBeenCalledWith(false);
  });

  it("uses provided session template keys for the client catalogue", () => {
    render(
      <TemplatesPage
        accessMode="provided"
        allowedTemplateKeys={["spectrum"]}
      />,
    );

    expect(mockUseTemplateAccess).toHaveBeenCalledWith(false);
    expect(screen.getByText("بەردەستەکان: 1")).toBeInTheDocument();
  });

  it("keeps the template catalogue inside the SponsorKrd theme boundary", () => {
    const { container } = render(<TemplatesPage />);

    expect(container.querySelector("[data-sponsor-krd-theme]")).not.toBeNull();
  });
});
