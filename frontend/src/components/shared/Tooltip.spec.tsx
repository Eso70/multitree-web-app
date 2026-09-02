import { render, screen, fireEvent, act } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>();
  return { ...actual, createPortal: (children: React.ReactNode) => children };
});

describe("Tooltip component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders trigger element without showing tooltip initially", () => {
    render(
      <Tooltip content="سڕینەوە">
        <button>سڕینەوەی ئایتەم</button>
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "سڕینەوەی ئایتەم" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip content on mouse enter after delay and hides on mouse leave", () => {
    render(
      <Tooltip content="دەستکاریکردن" delay={100}>
        <button>دەستکاری</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "دەستکاری" });
    fireEvent.mouseEnter(button);

    // Before delay timer expires
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // After delay timer expires
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("دەستکاریکردن")).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip on focus and hides on blur", () => {
    render(
      <Tooltip content="لەبەرگرتنەوە" delay={50}>
        <button>کۆپی</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "کۆپی" });
    fireEvent.focus(button);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("لەبەرگرتنەوە")).toBeInTheDocument();

    fireEvent.blur(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not show tooltip when disabled", () => {
    render(
      <Tooltip content="داخراوە" disabled={true} delay={50}>
        <button>داخراو</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "داخراو" });
    fireEvent.mouseEnter(button);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("merges layout className onto trigger without inflating tooltip bubble", () => {
    render(
      <Tooltip content="ڕوونکردنەوە" delay={50} className="w-full sm:flex-1">
        <button className="base-btn">کردار</button>
      </Tooltip>,
    );

    const button = screen.getByRole("button", { name: "کردار" });
    expect(button.className).toContain("w-full");
    expect(button.className).toContain("sm:flex-1");
    expect(button.className).toContain("base-btn");

    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.className).toContain("max-w-xs");
    expect(tooltip.className).toContain("text-xs");
    expect(tooltip.className).not.toContain("w-full");
    expect(tooltip.className).not.toContain("sm:flex-1");
  });
});
