import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalFooterActions } from "@/components/shared/ModalFooterActions";

describe("ModalFooterActions", () => {
  it("renders the standard cancel and submit actions", () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ModalFooterActions
        submitLabel="Save"
        submitDisabled={false}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "پاشگەزبوونەوە" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("locks both actions and shows the loading label while submitting", () => {
    render(
      <ModalFooterActions
        submitLabel="Save"
        submitDisabled={false}
        isSubmitting
        submittingLabel="Saving..."
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "پاشگەزبوونەوە" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("supports a single confirmation action", () => {
    render(
      <ModalFooterActions
        showCancel={false}
        submitLabel="Done"
        submitDisabled={false}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });
});
