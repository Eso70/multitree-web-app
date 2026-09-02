import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";
import { ClientLinktreeDashboard } from "./ClientLinktreeDashboard";
import type { ClientAccessContext, ClientLinktreeAnalytics } from "../types";

vi.mock("@/features/templates/components/TemplatesPage", () => ({
  TemplatesPage: ({
    accessMode,
    allowedTemplateKeys,
  }: {
    accessMode: string;
    allowedTemplateKeys: string[];
  }) => (
    <div
      data-testid="client-templates-page"
      data-access-mode={accessMode}
      data-template-keys={allowedTemplateKeys.join(",")}
    />
  ),
}));

const context: ClientAccessContext = {
  clientLabel: "Ismail",
  expiresAt: "2026-09-29T00:00:00.000Z",
  templateKeys: ["classic"],
  linktree: null,
};

function renderDashboard(
  nextContext: ClientAccessContext,
  analytics: ClientLinktreeAnalytics | null = null,
) {
  const onCreate = vi.fn();
  const view = render(
    <ThemeProvider websiteColor="#2563eb" documentTheme="business">
      <ClientLinktreeDashboard
        context={nextContext}
        theme={null}
        analytics={analytics}
        analyticsLoading={false}
        onCreate={onCreate}
        onRefreshAnalytics={vi.fn()}
        onLogout={vi.fn()}
      />
    </ThemeProvider>,
  );
  return { onCreate, container: view.container };
}

describe("ClientLinktreeDashboard", () => {
  it("starts page creation and opens the shared plan-scoped template page", async () => {
    const { onCreate, container } = renderDashboard(context);

    expect(screen.getAllByText("پەیجەکان").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("aside nav button")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Toggle language" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /پەیجی نوێ/ }));
    expect(onCreate).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "قاڵبەکان" }));
    const templatesPage = await screen.findByTestId("client-templates-page");
    expect(templatesPage).toHaveAttribute("data-access-mode", "provided");
    expect(templatesPage).toHaveAttribute("data-template-keys", "classic");
  });

  it("shows only the invitation page analytics after creation", () => {
    renderDashboard(
      {
        ...context,
        linktree: {
          id: "page-id",
          name: "My page",
          slug: "my-page",
          uid: "page-uid",
          status: "active",
          subtitle: "My subtitle",
          description: "My description",
          image: null,
          templateKey: "classic",
          whatsappModalEnabled: true,
          createdAt: "2026-08-29T00:00:00.000Z",
          updatedAt: "2026-08-30T00:00:00.000Z",
        },
      },
      {
        unique_views: 7,
        unique_clicks: 3,
        total_views: 12,
        total_clicks: 5,
        clicks_by_platform: { WhatsApp: 5 },
        top_clicked_links: [
          {
            link_id: "link-id",
            platform: "whatsapp",
            display_name: "WhatsApp",
            click_count: 5,
            click_count_raw: 5,
          },
        ],
      },
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("کۆی بینینەکان")).toBeInTheDocument();
    expect(screen.getAllByText("بینەری تاک").length).toBeGreaterThan(0);
    expect(screen.getByText("کۆی کلیکەکان")).toBeInTheDocument();
    expect(screen.getAllByText("کلیککەری تاک").length).toBeGreaterThan(0);
    expect(screen.queryByText("کۆی پەڕەکانی لینکتری")).toBeNull();
    expect(screen.queryByText("ڕێژەی کلیک")).toBeNull();
    expect(screen.getByText("My page")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ئامار" })).toBeInTheDocument();
    expect(screen.queryByText("باشترین بەستەرەکان")).toBeNull();
    expect(screen.queryByText("WhatsApp")).toBeNull();
    expect(screen.getByRole("link", { name: /my-page/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/linktree/my-page"),
    );
  });
});
