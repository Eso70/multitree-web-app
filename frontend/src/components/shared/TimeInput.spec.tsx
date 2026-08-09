import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimeInput, parseTypedTime } from "./TimeInput";

describe("parseTypedTime", () => {
  it("reads both notations", () => {
    expect(parseTypedTime("21:30")).toBe("21:30");
    expect(parseTypedTime("9:30 pm")).toBe("21:30");
    expect(parseTypedTime("0930PM")).toBe("21:30");
    // A bare time is taken at face value rather than second-guessed.
    expect(parseTypedTime("09:30")).toBe("09:30");
    expect(parseTypedTime("12:00 am")).toBe("00:00");
    expect(parseTypedTime("12:00 pm")).toBe("12:00");
  });

  it("rejects impossible times", () => {
    expect(parseTypedTime("25:00")).toBeNull();
    expect(parseTypedTime("10:75")).toBeNull();
    expect(parseTypedTime("13:00 pm")).toBeNull();
    expect(parseTypedTime("")).toBeNull();
  });
});

describe("TimeInput", () => {
  it("shows the stored 24-hour value in 12-hour form", () => {
    render(<TimeInput label="کاتی کردنەوە" value="18:05" onChange={vi.fn()} />);
    expect(screen.getByLabelText("کاتی کردنەوە")).toHaveValue("06:05 PM");
  });

  it("reports a typed time back in 24-hour form", () => {
    const onChange = vi.fn();
    render(<TimeInput label="کاتی داخستن" value="09:00" onChange={onChange} />);
    const field = screen.getByLabelText("کاتی داخستن");
    fireEvent.change(field, { target: { value: "0230 pm" } });
    fireEvent.blur(field);
    expect(onChange).toHaveBeenCalledWith("14:30");
  });

  it("keeps the last good time when the entry is unreadable", () => {
    const onChange = vi.fn();
    render(<TimeInput label="کات" value="09:00" onChange={onChange} />);
    const field = screen.getByLabelText("کات");
    fireEvent.change(field, { target: { value: "99:99" } });
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveValue("09:00 AM");
  });

  it("opens the wheels and commits a chosen hour", () => {
    const onChange = vi.fn();
    render(<TimeInput label="کات" value="09:00" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("کردنەوەی کات"));
    const hours = screen.getByRole("group", { name: "کاتژمێر" });
    fireEvent.click(within(hours).getByText("11"));
    expect(onChange).toHaveBeenCalledWith("11:00");
  });
});

function within(element: HTMLElement) {
  return {
    getByText: (text: string) => {
      const match = Array.from(element.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === text,
      );
      if (!match) throw new Error(`No button labelled ${text}`);
      return match;
    },
  };
}
