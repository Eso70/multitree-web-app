import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RootLinktreesPage } from "./PlatformLinktreesPage";

vi.mock("@/lib/api/request", () => ({
  apiRequest: vi.fn(() => new Promise(() => undefined)),
}));

describe("RootLinktreesPage loading", () => {
  it("does not mount a modal skeleton until a modal is opened", () => {
    render(<RootLinktreesPage />);

    expect(screen.queryByLabelText("Loading dialog")).not.toBeInTheDocument();
  });
});
