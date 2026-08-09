import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsSummaryCards } from "@/features/analytics/components/AnalyticsSummaryCards";

describe("AnalyticsSummaryCards", () => {
  it("renders scope-provided labels with shared conversion presentation", () => {
    render(
      <AnalyticsSummaryCards
        views={20}
        clicks={5}
        viewsLabel="Scoped views"
        clicksLabel="Scoped clicks"
      />,
    );

    expect(screen.getByText("Scoped views")).toBeInTheDocument();
    expect(screen.getByText("Scoped clicks")).toBeInTheDocument();
  });
});
