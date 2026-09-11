import { render, screen } from "@testing-library/react";
import { SponsorKrdMarketingFooter } from "./SponsorKrdMarketingFooter";

describe("SponsorKrdMarketingFooter", () => {
  it("renders the SponsorKrd footer in LTR with concise English navigation", () => {
    const { container } = render(
      <SponsorKrdMarketingFooter accentColor="#25F4EE" />,
    );

    expect(container.querySelector("footer")).toHaveAttribute("dir", "ltr");
    expect(screen.queryByRole("navigation", { name: "Product" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(screen.getByText(/All rights reserved$/)).toBeInTheDocument();
  });
});
