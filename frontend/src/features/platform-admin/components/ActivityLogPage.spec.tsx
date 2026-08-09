import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AuditLogPage } from "@linktree/types";
import { ActivityLogPage } from "./ActivityLogPage";

const auditPage: AuditLogPage = {
  items: [
    {
      id: "audit:12",
      kind: "audit",
      actorType: "platform-admin",
      actorId: "11111111-1111-1111-1111-111111111111",
      actorLabel: "Platform Operator",
    businessId: null,
    businessLabel: null,
    linktreeId: null,
    linktreeLabel: null,
      eventType: "platform.business.create",
      outcome: "success",
      resourceType: "business",
      resourceId: "22222222-2222-2222-2222-222222222222",
      resourceLabel: "Acme",
      requestId: "request-12",
      ipAddress: "203.0.113.10",
      userAgent: "test-agent",
      metadata: { changedFields: ["name"] },
      httpMethod: null,
      requestPath: null,
      statusCode: null,
      durationMs: null,
      source: null,
      createdAt: "2026-07-15T10:00:00.000Z",
    },
  ],
  summary: {
    total: 1,
    successful: 1,
    failed: 0,
    denied: 0,
    last24Hours: 1,
  },
  eventTypes: [{ value: "platform.business.create", count: 1 }],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
  },
};

describe("ActivityLogPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: auditPage }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads real audit data and opens event details", async () => {
    render(<ActivityLogPage />);

    await waitFor(() =>
      expect(screen.getAllByText("دروستکردنی بزنس").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Platform Operator").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "بینینی وردەکاری" }));

    expect(
      screen.getByRole("dialog", { name: "وردەکاری تۆماری چاودێری" }),
    ).toBeInTheDocument();
    expect(screen.getByText("request-12")).toBeInTheDocument();
    expect(screen.getAllByText("203.0.113.10").length).toBeGreaterThan(0);
  });

  it("sends a real failed-only filter from the custom filter modal", async () => {
    render(<ActivityLogPage />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "گەڕان و ڕیزکردن" }));
    fireEvent.click(await screen.findByRole("button", { name: "هەموو ئەنجامەکان" }));
    fireEvent.click(screen.getByRole("option", { name: "تەنها شکستخواردوو" }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      expect(String(calls.at(-1)?.[0])).toContain("outcome=failure");
    });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    await waitFor(() =>
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument(),
    );
  });
});
