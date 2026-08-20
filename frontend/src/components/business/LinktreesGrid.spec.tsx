import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinktreePill } from "@/components/business/LinktreeMeta";
import { LinktreesGrid } from "@/components/business/LinktreesGrid";
import type { LinktreeListItem } from "@linktree/types";

const item: LinktreeListItem = {
  id: "page-1",
  uid: "page-one",
  name: "Page one",
  subtitle: "Headline",
  description: "Description",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-02T00:00:00.000Z",
  analytics: { unique_views: 18, unique_clicks: 4 },
};

describe("LinktreesGrid shared public-page presentation", () => {
  it("uses custom metadata and traffic wording without changing the card layout", () => {
    const DomainMeta = () => <LinktreePill label="بڵاوکراوە" />;

    render(
      <LinktreesGrid
        data={[item]}
        showPageMeta
        MetaBadgesComponent={DomainMeta}
        trafficLabels={{
          column: "ترافیک",
          views: "بینەری تاک",
          interactions: "کۆی کردار",
        }}
      />,
    );

    expect(screen.getByText("بڵاوکراوە")).toBeInTheDocument();
    expect(screen.getByText("دروستکراوە")).toBeInTheDocument();
    expect(screen.getByText("نوێکراوە")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("کۆی کردار")).toBeInTheDocument();
  });
});
