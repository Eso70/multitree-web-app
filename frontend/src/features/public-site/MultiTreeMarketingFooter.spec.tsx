import { render, screen } from "@testing-library/react";
import { MultiTreeMarketingFooter } from "./MultiTreeMarketingFooter";

describe("MultiTreeMarketingFooter", () => {
  it("renders the MultiTree footer in LTR with concise English navigation", () => {
    const { container } = render(
      <MultiTreeMarketingFooter accentColor="#b6f20d" />,
    );

    expect(container.querySelector("footer")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("navigation", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mini Website" })).toHaveAttribute(
      "href",
      "/mini-website",
    );
    expect(screen.getByText(/All rights reserved$/)).toBeInTheDocument();
  });
});
