import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManagementModal } from "@/components/shared/ManagementModal";

/**
 * The modal renders through a portal on `document.body`, so it inherits
 * whatever accent the document carries — MultiTree's own, in every business
 * dashboard. A modal that is editing something with a colour of its own has to
 * override that, or the business designs their page surrounded by our brand.
 */
function shell() {
  return document.querySelector<HTMLElement>(".modal-ltr");
}

describe("ManagementModal accent scoping", () => {
  it("rescopes the platform accent to the colour being edited", () => {
    render(
      <ManagementModal
        isOpen
        onClose={vi.fn()}
        title="Editing"
        accentColor="#2563eb"
      >
        <p>content</p>
      </ManagementModal>,
    );

    const root = shell();
    // Every reusable control inside reads one of these, so setting them here is
    // what makes checkboxes, selects and wizard actions follow along.
    expect(root?.style.getPropertyValue("--multitree-accent")).toBe("#2563eb");
    expect(root?.style.getPropertyValue("--theme-primary")).toBe("#2563eb");
    // Dark ink would vanish on a dark blue fill.
    expect(root?.style.getPropertyValue("--multitree-accent-ink")).toBe(
      "#ffffff",
    );
  });

  it("picks dark ink for a pale accent", () => {
    render(
      <ManagementModal
        isOpen
        onClose={vi.fn()}
        title="Editing"
        accentColor="#eef7c4"
      >
        <p>content</p>
      </ManagementModal>,
    );

    expect(shell()?.style.getPropertyValue("--multitree-accent-ink")).toBe(
      "#111827",
    );
  });

  it("carries a gradient's first colour into the flat accent slots", () => {
    render(
      <ManagementModal
        isOpen
        onClose={vi.fn()}
        title="Editing"
        accentColor="gradient:to-r:#2563eb:#7c3aed"
      >
        <p>content</p>
      </ManagementModal>,
    );

    const root = shell();
    expect(root?.style.getPropertyValue("--multitree-accent")).toBe("#2563eb");
    expect(root?.style.getPropertyValue("--theme-css")).toContain(
      "linear-gradient",
    );
  });

  it("leaves the platform accent alone when no colour is given", () => {
    render(
      <ManagementModal isOpen onClose={vi.fn()} title="Platform">
        <p>content</p>
      </ManagementModal>,
    );

    const root = shell();
    expect(root?.dataset.multitreeTheme).toBe("true");
    expect(root?.style.getPropertyValue("--theme-primary")).toBe(
      "var(--multitree-accent)",
    );
    expect(root?.style.getPropertyValue("--multitree-accent")).toBe("");
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });
});

describe("ManagementModal focus lifecycle", () => {
  it("cannot be dismissed when it owns a required workflow", () => {
    const onClose = vi.fn();
    render(
      <ManagementModal isOpen locked onClose={onClose} title="Required setup">
        <p>Complete setup</p>
      </ManagementModal>,
    );

    const root = shell();
    expect(root).not.toBeNull();
    fireEvent.mouseDown(root as HTMLElement);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("moves focus into the dialog when it opens", () => {
    render(
      <ManagementModal isOpen onClose={vi.fn()} title="Focus test">
        <button type="button">Action</button>
      </ManagementModal>,
    );

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("keeps forward and reverse tab navigation inside the dialog", () => {
    render(
      <ManagementModal isOpen onClose={vi.fn()} title="Focus trap">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </ManagementModal>,
    );

    const dialog = screen.getByRole("dialog");
    const closeButton = screen.getAllByRole("button")[0];
    const lastButton = screen.getByRole("button", { name: "Last action" });

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    dialog.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });

  it("restores the element focused before the dialog opened", () => {
    const opener = document.createElement("button");
    opener.textContent = "Open";
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(
      <ManagementModal isOpen onClose={vi.fn()} title="Restore focus">
        <p>Content</p>
      </ManagementModal>,
    );
    expect(screen.getByRole("dialog")).toHaveFocus();

    rerender(
      <ManagementModal isOpen={false} onClose={vi.fn()} title="Restore focus">
        <p>Content</p>
      </ManagementModal>,
    );

    expect(opener).toHaveFocus();
    opener.remove();
  });
});
