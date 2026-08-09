import { render, screen } from "@testing-library/react";
import { AnalyticsOverviewStory } from "./AnalyticsOverviewStory";

describe("AnalyticsOverviewStory", () => {
  it("explains business-wide performance without chart-dependent UI", () => {
    render(
      <AnalyticsOverviewStory
        totals={{
          total_views: 100,
          unique_views: 80,
          total_clicks: 25,
          unique_clicks: 20,
          conversions: 5,
          new_visitors: 60,
          returning_visitors: 20,
          returning_rate: 25,
          bounce_rate: 15,
          avg_engagement_seconds: 75,
        }}
        referrers={[{ key: "Direct", total: 40 }]}
        devices={[{ key: "mobile", total: 70 }]}
        countries={[{ key: "IQ", total: 55 }]}
        detailsLocked={false}
      />,
    );

    expect(screen.getByText("ڕێژەی کلیککردنی سەردانکەران")).toBeInTheDocument();
    expect(screen.getByText("ئەنجامە گرنگە تەواوکراوەکان")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("هاتنی ڕاستەوخۆ")).toBeInTheDocument();
    expect(screen.getByText("مۆبایل")).toBeInTheDocument();
    expect(screen.getByText(/عێراق/)).toBeInTheDocument();
  });
});
