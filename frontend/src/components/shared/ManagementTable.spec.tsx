import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Users } from "lucide-react";
import {
  ManagementTable,
  type ManagementTableColumn,
} from "@/components/shared/ManagementTable";

interface Row {
  id: string;
  name: string;
}

const COLUMNS: ManagementTableColumn[] = [
  { key: "name", header: "ناو" },
  { key: "actions", header: "کارەکان" },
];

function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    name: `Row ${index + 1}`,
  }));
}

function renderTable(props: Partial<React.ComponentProps<typeof ManagementTable<Row>>> = {}) {
  return render(
    <ManagementTable<Row>
      data={rows(25)}
      columns={COLUMNS}
      getRowKey={(item) => item.id}
      renderRow={(item) => (
        <tr>
          <td>{item.name}</td>
          <td>—</td>
        </tr>
      )}
      renderCard={(item) => <div>{item.name}</div>}
      {...props}
    />,
  );
}

/** Body rows of the desktop table, ignoring the header row. */
function bodyRowCount() {
  const table = screen.getByRole("table");
  return within(table).getAllByRole("row").length - 1;
}

describe("ManagementTable pagination", () => {
  it("pages a client-paged list twenty rows at a time", async () => {
    const user = userEvent.setup();
    renderTable({ pagination: { mode: "client" } });

    expect(bodyRowCount()).toBe(20);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /دواتر/ }));

    expect(bodyRowCount()).toBe(5);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("honours a caller's client page size", () => {
    renderTable({ pagination: { mode: "client", pageSize: 10 } });

    expect(bodyRowCount()).toBe(10);
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  /**
   * The server has already sliced the page, so slicing again would hide rows
   * the caller just fetched.
   */
  it("renders every row it is given in server mode and reports page changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderTable({
      data: rows(25),
      pagination: {
        mode: "server",
        page: 2,
        pageSize: 25,
        totalItems: 70,
        totalPages: 3,
        onPageChange,
      },
    });

    expect(bodyRowCount()).toBe(25);

    await user.click(screen.getByRole("button", { name: /دواتر/ }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("draws no footer when the caller asks for no pagination", () => {
    renderTable();

    expect(bodyRowCount()).toBe(25);
    expect(
      screen.queryByRole("button", { name: /دواتر/ }),
    ).not.toBeInTheDocument();
  });

  /**
   * Deleting the only record on the last page should land the reader on the
   * new last page rather than on an empty one.
   */
  it("clamps the client page when the list shrinks under it", async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable({ pagination: { mode: "client" } });

    await user.click(screen.getByRole("button", { name: /دواتر/ }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    rerender(
      <ManagementTable<Row>
        data={rows(20)}
        columns={COLUMNS}
        getRowKey={(item) => item.id}
        pagination={{ mode: "client" }}
        renderRow={(item) => (
          <tr>
            <td>{item.name}</td>
            <td>—</td>
          </tr>
        )}
        renderCard={(item) => <div>{item.name}</div>}
      />,
    );

    expect(bodyRowCount()).toBe(20);
    expect(screen.queryByText("2 / 2")).not.toBeInTheDocument();
  });

  it("shows the empty state instead of an empty table", () => {
    renderTable({
      data: [],
      pagination: { mode: "client" },
      empty: { icon: Users, title: "هیچ داتایەک نییە" },
    });

    expect(screen.getByText("هیچ داتایەک نییە")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
