import { render, screen } from "@testing-library/react";
import { SponsorKrdMarketingFooter } from "./SponsorKrdMarketingFooter";

describe("SponsorKrdMarketingFooter", () => {
  it("renders the SponsorKrd footer in LTR with concise English navigation", () => {
    const { container } = render(
      <SponsorKrdMarketingFooter accentColor="#25F4EE" />,
    );

    expect(container.querySelector("footer")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("navigation", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Linktree" })).toHaveAttribute(
      "href",
      "/link-in-bio",
    );
    expect(screen.getByText(/All rights reserved$/)).toBeInTheDocument();
  });
});
