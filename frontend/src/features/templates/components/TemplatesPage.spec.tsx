import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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
  PageHeader: ({
    title,
    action,
  }: {
    title: string;
    action: ReactNode;
  }) => (
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

    render(<TemplatesPage canCreate={false} />);

    expect(
      screen.getByRole("status", { name: "Loading templates" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it.each([
    { canCreate: false, surface: "business" },
    { canCreate: true, surface: "platform admin" },
  ])(
    "shows the mini website template tab in the $surface page",
    ({ canCreate }) => {
      render(<TemplatesPage canCreate={canCreate} />);

      expect(
        screen.getByRole("tab", { name: "قالبەکانی لینک تری" }),
      ).toHaveAttribute("aria-selected", "true");

      fireEvent.click(
        screen.getByRole("tab", { name: "قالبەکانی مینی وێبسایت" }),
      );

      expect(
        screen.getByRole("tab", { name: "قالبەکانی مینی وێبسایت" }),
      ).toHaveAttribute("aria-selected", "true");
      expect(
        screen.getByLabelText("Empty mini website template monitor"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Liquid Glass")).not.toBeInTheDocument();
      expect(screen.queryByText("MultiTree")).not.toBeInTheDocument();
      expect(
        screen.getByText("کۆی قالبەکان: 0"),
      ).toBeInTheDocument();
    },
  );
});
