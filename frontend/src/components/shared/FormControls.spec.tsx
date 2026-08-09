import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckboxField } from "./CheckboxField";
import { DateInput, DateTimeInput } from "./DateTimeInput";
import { CustomSelect } from "./CustomSelect";

describe("shared form controls", () => {
  it("renders an empty select safely and disables interaction", () => {
    render(
      <CustomSelect
        label="بزنس"
        value=""
        options={[]}
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /هیچ هەڵبژاردەیەک نییە/ });
    expect(trigger).toBeDisabled();
  });

  it("reports checkbox changes through a real checkbox input", () => {
    const onChange = vi.fn();
    render(
      <CheckboxField
        checked={false}
        onChange={onChange}
        label="کەناڵی ئاگاداری"
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "کەناڵی ئاگاداری" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("selects date and time through the custom picker", () => {
    const onChange = vi.fn();
    render(
      <DateTimeInput label="کاتی بڵاوکردنەوە" value="" onChange={onChange} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "کردنەوەی کاتی بڵاوکردنەوە" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "ئەمڕۆ" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    );
  });

  it("returns a date-only value through the reusable date picker", () => {
    const onChange = vi.fn();
    render(
      <DateInput
        label="بەرواری بەسەرچوون"
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("textbox", {
      name: "بەرواری بەسەرچوون",
    });
    fireEvent.change(input, { target: { value: "28/07/20" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("2028-07-20");
  });

  it("accepts a valid typed value in the documented format", () => {
    const onChange = vi.fn();
    render(<DateTimeInput label="کاتی کۆتایی" value="" onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: "کاتی کۆتایی" });
    fireEvent.change(input, { target: { value: "28/07/20" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("2028-07-20T00:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects impossible typed calendar dates", () => {
    const onChange = vi.fn();
    render(<DateTimeInput label="کاتی کۆتایی" value="" onChange={onChange} />);

    const input = screen.getByRole("textbox", { name: "کاتی کۆتایی" });
    fireEvent.change(input, { target: { value: "28/02/31" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("masks two-digit year, month, and day while typing", () => {
    const onChange = vi.fn();
    render(<DateTimeInput label="کاتی کۆتایی" value="" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "کاتی کۆتایی" });

    fireEvent.change(input, { target: { value: "28" } });
    expect(input).toHaveValue("28/");
    fireEvent.change(input, { target: { value: "28/3" } });
    expect(input).toHaveValue("28/03/");
    fireEvent.change(input, { target: { value: "28/03/9" } });
    expect(input).toHaveValue("28/03/09");
  });

  it("accepts February 29 only in a leap year", () => {
    const onChange = vi.fn();
    render(<DateTimeInput label="کاتی کۆتایی" value="" onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "کاتی کۆتایی" });

    fireEvent.change(input, { target: { value: "28/02/29" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2028-02-29T00:00");
  });

  it("prevents February 29 in a non-leap year", () => {
    render(<DateTimeInput label="کاتی کۆتایی" value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "کاتی کۆتایی" });

    fireEvent.change(input, { target: { value: "27/02/29" } });
    expect(input).toHaveValue("27/02/2");
  });
});
