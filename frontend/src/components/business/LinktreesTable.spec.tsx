import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinktreesTable } from "@/components/business/LinktreesTable";
import { LinktreePill } from "@/components/business/LinktreeMeta";
import type { LinktreeListItem } from "@linktree/types";

function item(overrides: Partial<LinktreeListItem> = {}): LinktreeListItem {
  return {
    id: "lt-1",
    uid: "uid-1",
    name: "Page one",
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

/** Header cells and every body row must agree, or the columns shear. */
function columnCounts() {
  const table = screen.getByRole("table");
  const [headerRow, ...bodyRows] = within(table).getAllByRole("row");
  return {
    headers: within(headerRow).getAllByRole("columnheader").length,
    rows: bodyRows.map((row) => within(row).getAllByRole("cell").length),
  };
}

describe("LinktreesTable column alignment", () => {
  /**
   * The traffic column is gated on a table-level flag rather than per row.
   * Gating the cell on `item.analytics` while the header asked "does any row
   * have analytics" would push every later cell one column left on any row
   * that happened to arrive without totals.
   */
  it("keeps every row aligned when only some rows carry analytics", () => {
    render(
      <LinktreesTable
        showLinktreeMeta
        data={[
          item({
            id: "with",
            analytics: { unique_views: 5, unique_clicks: 2 },
          }),
          item({ id: "without", name: "Page two" }),
        ]}
      />,
    );

    const { headers, rows } = columnCounts();
    expect(rows).toHaveLength(2);
    for (const cells of rows) expect(cells).toBe(headers);
  });

  it("keeps rows aligned when no row carries analytics", () => {
    render(
      <LinktreesTable showLinktreeMeta data={[item(), item({ id: "b" })]} />,
    );

    const { headers, rows } = columnCounts();
    for (const cells of rows) expect(cells).toBe(headers);
  });

  /**
   * The mini-website screen reuses this table without the Linktree-only
   * projection, so the slug column comes back and the counts have to follow.
   */
  it("keeps rows aligned for the partial projection", () => {
    render(
      <LinktreesTable
        data={[item({ analytics: { unique_views: 1, unique_clicks: 1 } })]}
      />,
    );

    const { headers, rows } = columnCounts();
    for (const cells of rows) expect(cells).toBe(headers);
  });

  /**
   * That screen puts its action count in `unique_clicks`, which the traffic
   * column's labels would misname, so the column belongs to the Linktree
   * projection rather than to the mere presence of `analytics`.
   */
  it("hides the traffic column outside the Linktree projection", () => {
    render(
      <LinktreesTable
        data={[item({ analytics: { unique_views: 99, unique_clicks: 7 } })]}
      />,
    );

    const table = within(screen.getByRole("table"));
    expect(table.queryByText("99")).not.toBeInTheDocument();
    expect(table.queryByText("ترافیک")).not.toBeInTheDocument();
  });

  it("shows the traffic numbers it was given", () => {
    render(
      <LinktreesTable
        showLinktreeMeta
        data={[item({ analytics: { unique_views: 1234, unique_clicks: 56 } })]}
      />,
    );

    // The component renders the desktop table and the mobile card together,
    // hiding one with CSS, so both carry the numbers. Scope to the table.
    const table = within(screen.getByRole("table"));
    expect(table.getByText("1,234")).toBeInTheDocument();
    expect(table.getByText("56")).toBeInTheDocument();
  });

  it("keeps the full list treatment customizable for another public-page domain", () => {
    const DomainMeta = () => <LinktreePill label="ڕەشنووس" />;

    render(
      <LinktreesTable
        showPageMeta
        MetaBadgesComponent={DomainMeta}
        trafficLabels={{
          column: "کردارەکان",
          views: "بینەری تاک",
          interactions: "کۆی کردار",
        }}
        data={[
          item({
            seo_name: "ڕەشنووس",
            analytics: { unique_views: 99, unique_clicks: 7 },
          }),
        ]}
      />,
    );

    const table = within(screen.getByRole("table"));
    expect(table.getByText("کردارەکان")).toBeInTheDocument();
    expect(table.getByText("99")).toBeInTheDocument();
    expect(table.getByText("7")).toBeInTheDocument();
    expect(table.getByText("ڕەشنووس")).toBeInTheDocument();
    expect(table.queryByText("Slug")).not.toBeInTheDocument();
  });
});
