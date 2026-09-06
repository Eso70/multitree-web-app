import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DuplicateLinktreeModal } from "./DuplicateLinktreeModal";
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

const mockApiRequest = vi.fn();
vi.mock("@/lib/api/request", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  isApiRequestError: () => false,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("DuplicateLinktreeModal", () => {
  const sampleTarget: LinktreeListItem = {
    id: "lt-uuid-1",
    name: "فروشگای کوردی",
    seo_name: "kurd-store",
    uid: "lt-kurd123",
    image: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    is_default: true,
    status: "active",
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("check-slug")) {
        return Promise.resolve(true);
      }
      if (typeof url === "string" && url.includes("/duplicate")) {
        return Promise.resolve({ success: true, data: { id: "new-id" } });
      }
      return Promise.resolve(true);
    });
  });

  it("renders with pre-populated duplicate name and slug suggestion", () => {
    render(
      <DuplicateLinktreeModal
        isOpen={true}
        onClose={mockOnClose}
        targetLinktree={sampleTarget}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText("لەبەرگرتنەوەی پەڕە")).toBeInTheDocument();
    expect(screen.getByText("فروشگای کوردی")).toBeInTheDocument();
    expect(screen.getByDisplayValue("فروشگای کوردی")).toBeInTheDocument();
    expect(screen.getByDisplayValue("kurd-store-copy")).toBeInTheDocument();
  });

  it("submits duplicate request with chosen name and slug", async () => {
    render(
      <DuplicateLinktreeModal
        isOpen={true}
        onClose={mockOnClose}
        targetLinktree={sampleTarget}
        onSuccess={mockOnSuccess}
      />,
    );

    // Wait for slug availability check to resolve
    await waitFor(() => {
      expect(screen.getByText("ئەم نازناوە بەردەستە")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /لەبەرگرتنەوە/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/linktrees/lt-uuid-1/duplicate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "فروشگای کوردی",
            slug: "kurd-store-copy",
          }),
        }),
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("disables duplicate button and shows warning when target linktree is at max depth (depth >= 3)", () => {
    const deepTarget: LinktreeListItem = {
      ...sampleTarget,
      template_config: {
        _copy_lineage: {
          depth: 3,
          source_id: "lt-parent",
          origin_id: "lt-root",
        },
      } as Record<string, unknown>,
    };

    render(
      <DuplicateLinktreeModal
        isOpen={true}
        onClose={mockOnClose}
        targetLinktree={deepTarget}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText(/گەیشتووەتە ئەوپەڕی ئاستی لەبەرگرتنەوە/)).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: /لەبەرگرتنەوە/i });
    expect(submitBtn).toBeDisabled();
  });
});
