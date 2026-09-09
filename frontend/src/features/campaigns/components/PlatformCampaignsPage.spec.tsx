import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PlatformCampaignsPage,
  summarizeCampaigns,
} from "./PlatformCampaignsPage";
import { INITIAL_MOCK_CAMPAIGNS } from "../mock-data";

describe("PlatformCampaignsPage", () => {
  it("renders the shared six-card campaign summary", () => {
    render(<PlatformCampaignsPage />);

    expect(screen.getByText("کۆی کەمپەینەکان")).toBeInTheDocument();
    expect(screen.getByText("کەمپەینی چالاک")).toBeInTheDocument();
    expect(screen.getByText("کۆی پیشاندانەکان")).toBeInTheDocument();
    expect(screen.getByText("کۆی کلیکەکان")).toBeInTheDocument();
    expect(screen.getByText("کۆی خەرجی")).toBeInTheDocument();
    expect(screen.getByText("کۆی گۆڕانەکان")).toBeInTheDocument();
  });

  it("derives every total from the campaign collection", () => {
    expect(summarizeCampaigns(INITIAL_MOCK_CAMPAIGNS)).toEqual({
      campaigns: 4,
      activeCampaigns: 2,
      impressions: 142470,
      clicks: 9150,
      totalSpent: 539.6,
      conversions: 725,
    });
  });
});
