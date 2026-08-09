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
});
