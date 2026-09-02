import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinktreeSearchModal } from "./LinktreeSearchModal";
import type { LinktreeListItem } from "@linktree/types";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

describe("LinktreeSearchModal", () => {
  const sampleItems: LinktreeListItem[] = [
    {
      id: "lt-1",
      name: "کۆمپانیای ئاسۆ",
      seo_name: "aso-company",
      uid: "aso-123",
      image: null,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      status: "active",
    },
    {
      id: "lt-2",
      name: "فرۆشگای نیشتمان",
      seo_name: "nishtiman-store",
      uid: "nishtiman-456",
      image: null,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      status: "active",
    },
  ];

  it("renders when open and shows empty search prompt when query is empty", () => {
    render(
      <LinktreeSearchModal
        isOpen
        onClose={vi.fn()}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        items={sampleItems}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByPlaceholderText("ناوی پەیج بنووسە بۆ گەڕان..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("گەڕان بۆ پەیجەکان بکە....."),
    ).toBeInTheDocument();
  });

  it("filters items by name and slug", () => {
    render(
      <LinktreeSearchModal
        isOpen
        searchQuery="ئاسۆ"
        onSearchQueryChange={vi.fn()}
        items={sampleItems}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("کۆمپانیای ئاسۆ")).toBeInTheDocument();
    expect(screen.queryByText("فرۆشگای نیشتمان")).not.toBeInTheDocument();
  });

  it("selects an item and closes when item is clicked", () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <LinktreeSearchModal
        isOpen
        searchQuery="aso"
        onSearchQueryChange={vi.fn()}
        items={sampleItems}
        onSelect={handleSelect}
        onClose={handleClose}
      />,
    );

    const selectButton = screen.getByText("کۆمپانیای ئاسۆ").closest("button");
    expect(selectButton).toBeTruthy();
    if (selectButton) fireEvent.click(selectButton);

    expect(handleSelect).toHaveBeenCalledWith(sampleItems[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when ESC button is clicked", () => {
    const handleClose = vi.fn();

    render(
      <LinktreeSearchModal
        isOpen
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        items={sampleItems}
        onSelect={vi.fn()}
        onClose={handleClose}
      />,
    );

    const closeBtn = screen.getByLabelText("داخستن");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});
