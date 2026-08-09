import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalWizardActions } from "@/components/shared/ModalWizardActions";
import { ModalWizardProgress } from "@/components/shared/ModalWizardProgress";

describe("shared modal wizard presentation", () => {
  it("preserves MultiTree active and completed step classes", () => {
    const { container } = render(
      <ModalWizardProgress
        variant="multitree"
        currentStep="details"
        steps={[
          { id: "business", label: "Business" },
          { id: "details", label: "Details" },
          { id: "links", label: "Links" },
        ]}
      />,
    );

    expect(screen.getByText("✓").className).toContain("sa-step-soft");
    expect(screen.getByText("2").className).toContain("sa-gradient");
    expect(container.querySelectorAll(".sa-gradient")).toHaveLength(2);
  });

  it("gives inactive themed steps and connectors dark-mode contrast", () => {
    const { container } = render(
      <ModalWizardProgress
        currentStep="business"
        steps={[
          { id: "business", label: "Business" },
          { id: "platforms", label: "Platforms" },
          { id: "links", label: "Links" },
        ]}
      />,
    );

    expect(screen.getByTestId("modal-wizard-progress").className).toContain(
      "bg-transparent",
    );
    expect(screen.getByText("2").className).toContain("dark:bg-slate-800");
    expect(screen.getByText("Platforms").parentElement?.className).toContain(
      "dark:text-slate-400",
    );
    expect(container.querySelector(".dark\\:bg-slate-700")).toBeTruthy();
    expect(screen.getByText("2")).not.toHaveStyle({
      backgroundColor: "#f8fafc",
    });
  });

  it("keeps workflow callbacks in the owning container", () => {
    const onBack = vi.fn();
    const onNext = vi.fn();
    render(
      <ModalWizardActions
        isFirstStep={false}
        isFinalStep={false}
        isSubmitting={false}
        canContinue
        submitLabel="Save"
        onBack={onBack}
        onCancel={vi.fn()}
        onNext={onNext}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("گەڕانەوە"));
    fireEvent.click(screen.getByText("بەردەوام بە"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("can keep invalid actions enabled so their owner can show inline errors", () => {
    const onNext = vi.fn();
    const onSaveCurrent = vi.fn();
    render(
      <ModalWizardActions
        isFirstStep
        isFinalStep={false}
        isSubmitting={false}
        canContinue={false}
        disableWhenInvalid={false}
        submitLabel="Save"
        saveCurrentLabel="Save now"
        onSaveCurrent={onSaveCurrent}
        onBack={vi.fn()}
        onCancel={vi.fn()}
        onNext={onNext}
        onSubmit={vi.fn()}
      />,
    );

    const nextButton = screen.getByText("بەردەوام بە").closest("button");
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(screen.getByText("بەردەوام بە"));
    fireEvent.click(screen.getByText("Save now"));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onSaveCurrent).toHaveBeenCalledTimes(1);
  });
});
