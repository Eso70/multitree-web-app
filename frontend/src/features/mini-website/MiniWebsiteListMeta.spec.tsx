import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MiniWebsiteListMeta } from "./MiniWebsiteListMeta";

describe("MiniWebsiteListMeta", () => {
  it("renders mini-website status and template badges", () => {
    render(
      <MiniWebsiteListMeta
        item={{
          created_at: "2026-08-01T00:00:00.000Z",
          seo_name: "بڵاوکراوە",
          template_key: "liquid-glass",
        }}
        showTemplate
      />,
    );

    expect(screen.getByText("بڵاوکراوە")).toBeInTheDocument();
    expect(screen.getByText("Liquid Glass")).toBeInTheDocument();
  });
});
