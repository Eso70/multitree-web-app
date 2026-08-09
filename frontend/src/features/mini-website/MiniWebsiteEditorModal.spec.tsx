import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MiniWebsiteEditorModal } from "./MiniWebsiteEditorModal";
import { createMiniWebsiteDraft } from "./types";
import { ThemeProvider } from "@/lib/contexts/ThemeProvider";

vi.mock("./MiniWebsiteContentStep", () => ({
  MiniWebsiteHeroMediaFields: () => <div data-testid="hero-fields" />,
}));

vi.mock("./MiniWebsiteBackgroundStyleField", () => ({
  MiniWebsiteBackgroundStyleField: () => (
    <div data-testid="background-style-field" />
  ),
}));

vi.mock("./MiniWebsiteLocationStep", () => ({
  MiniWebsiteLocationFields: () => null,
}));

function validIdentityDraft() {
  const draft = createMiniWebsiteDraft();
  draft.name = "Existing profile";
  draft.slug = "existing-profile";
  draft.headline = "Existing headline";
  draft.bio = "Existing about text";
  draft.avatar = "/images/DefaultAvatar.png";
  draft.professionTemplate = "custom";
  return draft;
}

describe("MiniWebsiteEditorModal actions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps Next enabled and shows inline errors after it is pressed", () => {
    const draft = validIdentityDraft();
    draft.headline = "";
    draft.bio = "";

    render(
      <ThemeProvider websiteColor="#0f172a">
        <MiniWebsiteEditorModal
          isOpen
          initial={draft}
          defaultAvatar="/images/DefaultAvatar.png"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </ThemeProvider>,
    );

    const next = screen.getByRole("button", { name: "بەردەوام بە" });
    expect(next).not.toBeDisabled();
    fireEvent.click(next);

    expect(screen.getByText("سەردێڕ پێویستە.")).toBeInTheDocument();
    expect(
      screen.getByText("پێناسەیەکی کورت پێویستە."),
    ).toBeInTheDocument();
  });

  it("saves an edit immediately from the first step", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: true }),
      }),
    );

    render(
      <ThemeProvider websiteColor="#0f172a">
        <MiniWebsiteEditorModal
          isOpen
          initial={validIdentityDraft()}
          editorId="mini-1"
          defaultAvatar="/images/DefaultAvatar.png"
          onClose={vi.fn()}
          onSave={onSave}
        />
      </ThemeProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "ئێستا پاشەکەوت بکە" }),
    );

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].status).toBe("draft");
  });
});
