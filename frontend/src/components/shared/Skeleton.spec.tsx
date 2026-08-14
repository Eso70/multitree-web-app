import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Skeleton,
  SkeletonCardGrid,
  SkeletonDashboardPage,
  SkeletonDashboardShell,
  SkeletonForm,
  SkeletonList,
  SkeletonManagementPage,
  SkeletonMiniWebsiteTemplate,
  SkeletonModal,
  SkeletonStatCards,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonTemplatePage,
  SkeletonText,
} from "@/components/shared/Skeleton";

describe("loading skeletons", () => {
  it("holds still for a reader who asked for less motion", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    const block = container.firstElementChild;

    expect(block?.className).not.toMatch(/\banimate-/);
  });

  it("hides the placeholder blocks from assistive technology", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("announces the wait once per group rather than per block", () => {
    render(<SkeletonTable rows={4} />);
    // One status for the group; the blocks inside stay hidden, so a screen
    // reader hears "loading" rather than four dozen empty elements.
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("renders the number of rows it was asked for", () => {
    const { container } = render(<SkeletonTable rows={4} />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(4);
  });

  it("ends a block of text short, the way a paragraph does", () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = Array.from(
      container.querySelectorAll("[aria-hidden='true']"),
    );

    expect(lines).toHaveLength(3);
    expect(lines[0].className).toContain("w-full");
    expect(lines[2].className).toContain("w-2/3");
  });

  it("mirrors the layout it stands in for", () => {
    const grid = render(<SkeletonCardGrid count={3} />);
    // Same count as the cards that will land, so nothing shifts on arrival.
    expect(grid.container.querySelectorAll(".rounded-2xl")).toHaveLength(3);
    grid.unmount();

    const stats = render(<SkeletonStatCards count={4} />);
    expect(stats.container.firstElementChild?.className).toContain(
      "sm:grid-cols-4",
    );
    stats.unmount();

    const list = render(<SkeletonList rows={5} />);
    expect(list.container.querySelectorAll(".p-3")).toHaveLength(5);
  });

  it("provides layout-matched form, page, and dialog fallbacks", () => {
    const form = render(<SkeletonForm fields={3} />);
    expect(
      form.getByRole("status", { name: "Loading form data" }),
    ).toBeInTheDocument();
    form.unmount();

    const page = render(<SkeletonManagementPage cardCount={2} statCount={6} />);
    expect(
      page.getByRole("status", { name: "Loading management page" }),
    ).toBeInTheDocument();
    page.unmount();

    const modal = render(<SkeletonModal />);
    expect(
      modal.getByRole("status", { name: "Loading dialog" }),
    ).toBeInTheDocument();
    expect(modal.getAllByRole("status")).toHaveLength(1);
  });

  it.each(["analytics", "table", "form"] as const)(
    "provides one accessible status for the %s dashboard body",
    (body) => {
      render(<SkeletonDashboardPage body={body} statCount={4} tabCount={3} />);
      expect(
        screen.getByRole("status", { name: "Loading dashboard data" }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("status")).toHaveLength(1);
    },
  );

  it("reserves the shared dashboard sidebar and header during route loading", () => {
    const { container } = render(<SkeletonDashboardShell />);

    expect(container.querySelector("aside")).toBeInTheDocument();
    expect(container.querySelector("header")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading dashboard data" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("reserves the complete template catalog while permissions load", () => {
    render(<SkeletonTemplatePage />);
    expect(
      screen.getByRole("status", { name: "Loading templates" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("provides one accessible status while a mini-website template bundle loads", () => {
    render(<SkeletonMiniWebsiteTemplate />);
    expect(
      screen.getByRole("status", { name: "Loading mini website" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it.each(["standard", "funnel", "live", "comparison", "story"] as const)(
    "supports the %s metric-card shape",
    (variant) => {
      const { container } = render(<SkeletonStatCard variant={variant} />);
      expect(
        container.querySelector("[aria-hidden='true']"),
      ).toBeInTheDocument();
    },
  );
});
