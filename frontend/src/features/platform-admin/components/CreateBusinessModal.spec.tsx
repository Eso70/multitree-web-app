import { render, screen, fireEvent, act } from "@testing-library/react";
import { CreateBusinessModal } from "./CreateBusinessModal";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, priority: _priority, ...rest } = props;
    // The stand-in for next/image forwards whatever props the test supplies,
    // so the alt text and element choice are the component's, not this mock's.
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

vi.mock("@/features/link-editor/TemplateSelector", () => ({
  TemplateSelector: () => null,
}));

describe("CreateBusinessModal - single step", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            plans: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Basic",
                permissionProfileName: "Basic",
                status: "active",
                isDefault: true,
              },
            ],
          },
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderModal(props?: Partial<Parameters<typeof CreateBusinessModal>[0]>) {
    let view!: ReturnType<typeof render>;
    act(() => {
      view = render(
        <CreateBusinessModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          {...props}
        />
      );
    });
    return view;
  }

  it("renders create business title in create mode", () => {
    renderModal();
    expect(screen.getByText("زیادکردنی بزنسی نوێ")).toBeInTheDocument();
  });

  it("renders edit title in edit mode", () => {
    renderModal({
      editData: {
        id: "b1", username: "u", name: "Test Business",
        status: "active", created_at: "", updated_at: "",
      },
    });
    expect(screen.getByText("دەستکاریکردنی بزنس")).toBeInTheDocument();
  });

  it("renders BusinessInfoStep fields", () => {
    renderModal();
    expect(screen.getByLabelText(/ناوی بزنس/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ناوی بەکارهێنەر/)).toBeInTheDocument();
    expect(screen.getByLabelText(/وشەی تێپەڕبوون/)).toBeInTheDocument();
    expect(screen.getByLabelText(/سەب دۆمەین/)).toBeInTheDocument();
  });



  it("pre-populates fields in edit mode", () => {
    renderModal({
      editData: {
        id: "b1", username: "testuser", name: "Existing Business",
        subdomain: "existing-sub", phone: "7501234567",
        status: "active", website_color: "#ff0000",
        logo: "/images/logo.jpg", favicon: "/favicon.ico",
        default_avatar: "/images/avatar.png",
        ownerName: "Verified Owner",
        ownerEmail: "owner@example.com",
        created_at: "2024-01-01T00:00:00.000Z", updated_at: "2024-01-01T00:00:00.000Z",
      },
    });
    expect(screen.getByLabelText(/ناوی بزنس/)).toHaveValue("Existing Business");
    expect(screen.getByLabelText(/ناوی بەکارهێنەر/)).toHaveValue("testuser");
    expect(screen.getByLabelText(/سەب دۆمەین/)).toHaveValue("existing-sub");
    expect(screen.getByDisplayValue("Verified Owner")).toBeDisabled();
    expect(screen.getByDisplayValue("owner@example.com")).toBeDisabled();
  });

  it("shows cancel and submit buttons", () => {
    renderModal();
    expect(screen.getByText("هەڵوەشاندنەوە")).toBeInTheDocument();
    expect(screen.getByText("دروستکردن")).toBeInTheDocument();
  });

  it("shows نوێکردنەوە button in edit mode", () => {
    renderModal({
      editData: {
        id: "b1", username: "u", name: "Test",
        status: "active", created_at: "", updated_at: "",
      },
    });
    expect(screen.getByText("نوێکردنەوە")).toBeInTheDocument();
  });

  it("calls onClose when cancel is clicked", () => {
    renderModal();
    fireEvent.click(screen.getByText("هەڵوەشاندنەوە"));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    renderModal();
    const backdrop = document.querySelector("[class*='bg-black']");
    if (backdrop) fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
