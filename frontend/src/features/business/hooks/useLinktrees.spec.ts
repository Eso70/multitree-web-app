import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  sortLinktreesForDashboard,
  useLinktrees,
} from "@/features/business/hooks/useLinktrees";
import type { BusinessLinktreeSummary as Linktree } from "@linktree/types";

function createLinktree(overrides: Partial<Linktree>): Linktree {
  return {
    id: "linktree-id",
    name: "Page",
    uid: "page",
    subtitle: null,
    description: null,
    seo_name: "page",
    image: null,
    background_color: "#ffffff",
    template_key: null,
    template_config: {},
    whatsapp_modal_enabled: null,
    footer_text: null,
    footer_phone: null,
    footer_hidden: null,
    status: "active",
    is_default: false,
    business_default_avatar: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("useLinktrees", () => {
  it("keeps the default page first and sorts the remaining pages newest first", () => {
    const older = createLinktree({ id: "older", created_at: "2026-01-01T00:00:00.000Z" });
    const newer = createLinktree({ id: "newer", created_at: "2026-02-01T00:00:00.000Z" });
    const root = createLinktree({ id: "root", uid: "id", created_at: "2025-01-01T00:00:00.000Z" });

    expect(sortLinktreesForDashboard([older, root, newer]).map((item) => item.id)).toEqual([
      "root",
      "newer",
      "older",
    ]);
  });

  it("pins the is_default page first even when its uid is not the legacy one", () => {
    const newest = createLinktree({ id: "newest", created_at: "2026-05-01T00:00:00.000Z" });
    const flagged = createLinktree({
      id: "flagged",
      uid: "custom-slug",
      is_default: true,
      created_at: "2024-01-01T00:00:00.000Z",
    });

    expect(sortLinktreesForDashboard([newest, flagged]).map((item) => item.id)).toEqual([
      "flagged",
      "newest",
    ]);
  });

  it("promotes a page to default on merge and demotes the previous default", () => {
    const current = createLinktree({ id: "current", is_default: true, created_at: "2026-01-01T00:00:00.000Z" });
    const other = createLinktree({ id: "other", created_at: "2026-02-01T00:00:00.000Z" });
    const { result } = renderHook(() => useLinktrees([current, other]));

    act(() => result.current.mergeLinktree("other", { is_default: true }));

    expect(result.current.linktrees.map((item) => item.id)).toEqual(["other", "current"]);
    expect(result.current.linktrees.map((item) => item.is_default)).toEqual([true, false]);
  });

  it("provides domain mutations for optimistic dashboard updates", () => {
    const first = createLinktree({ id: "first", name: "First" });
    const { result } = renderHook(() => useLinktrees([first]));

    act(() => result.current.mergeLinktree("first", { name: "Updated" }));
    expect(result.current.linktrees[0].name).toBe("Updated");

    const second = createLinktree({ id: "second", name: "Second", created_at: "2026-03-01T00:00:00.000Z" });
    act(() => result.current.prependLinktree(second));
    expect(result.current.linktrees.map((item) => item.id)).toEqual(["second", "first"]);

    act(() => result.current.removeLinktree("first"));
    expect(result.current.linktrees.map((item) => item.id)).toEqual(["second"]);
  });

  it("always keeps the default page first, followed by active campaign pages, then remaining pages", () => {
    const regular = createLinktree({
      id: "regular",
      name: "Regular",
      created_at: "2026-03-01T00:00:00.000Z",
    });
    const campaignOlder = createLinktree({
      id: "campaign-older",
      name: "Campaign Older",
      is_campaign_active: true,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const campaignNewer = createLinktree({
      id: "campaign-newer",
      name: "Campaign Newer",
      is_campaign_active: true,
      created_at: "2026-04-01T00:00:00.000Z",
    });
    const defaultPage = createLinktree({
      id: "default",
      is_default: true,
      created_at: "2025-01-01T00:00:00.000Z",
    });

    const sorted = sortLinktreesForDashboard([regular, defaultPage, campaignOlder, campaignNewer]);
    expect(sorted.map((item) => item.id)).toEqual([
      "default",
      "campaign-newer",
      "campaign-older",
      "regular",
    ]);
  });

  it("promotes a non-default page right under the default page when merged with is_campaign_active", () => {
    const defaultPage = createLinktree({ id: "default", is_default: true, created_at: "2026-01-01T00:00:00.000Z" });
    const page1 = createLinktree({ id: "p1", created_at: "2026-02-01T00:00:00.000Z" });
    const page2 = createLinktree({ id: "p2", created_at: "2026-01-01T00:00:00.000Z" });
    const { result } = renderHook(() => useLinktrees([defaultPage, page1, page2]));

    expect(result.current.linktrees.map((item) => item.id)).toEqual(["default", "p1", "p2"]);

    act(() => result.current.mergeLinktree("p2", { is_campaign_active: true }));
    expect(result.current.linktrees.map((item) => item.id)).toEqual(["default", "p2", "p1"]);
    expect(result.current.linktrees[0].id).toBe("default");
    expect(result.current.linktrees[1].is_campaign_active).toBe(true);
  });
});
