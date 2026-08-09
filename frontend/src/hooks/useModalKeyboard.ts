"use client";

import { useEffect, useId, type RefObject } from "react";

const modalKeyboardStack: string[] = [];

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hidden &&
      !element.closest("[hidden]") &&
      !element.closest('[aria-hidden="true"]') &&
      !element.closest("[inert]"),
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  if (tagName === "textarea" || tagName === "select") return true;
  if (target.closest("button,a,[data-modal-enter-ignore]")) return true;
  return false;
}

interface UseModalKeyboardOptions {
  isOpen: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
  enterEnabled?: boolean;
  escapeEnabled?: boolean;
  /** Enables dialog focus entry, trapping, and restoration for this container. */
  dialogRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useModalKeyboard({
  isOpen,
  onEscape,
  onEnter,
  enterEnabled = true,
  escapeEnabled = true,
  dialogRef,
  initialFocusRef,
}: UseModalKeyboardOptions) {
  const id = useId();

  useEffect(() => {
    if (!isOpen) return;
    modalKeyboardStack.push(id);
    return () => {
      const index = modalKeyboardStack.lastIndexOf(id);
      if (index !== -1) modalKeyboardStack.splice(index, 1);
    };
  }, [id, isOpen]);

  useEffect(() => {
    if (!isOpen || !dialogRef) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusTarget = initialFocusRef?.current || dialog;
    focusTarget.focus();

    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [dialogRef, initialFocusRef, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const topmostId = modalKeyboardStack[modalKeyboardStack.length - 1];
      if (topmostId !== id) return;

      if (event.key === "Tab" && dialogRef?.current) {
        const dialog = dialogRef.current;
        const focusable = getFocusableElements(dialog);
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!dialog.contains(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return;
        }
        if (event.shiftKey && (active === first || active === dialog)) {
          event.preventDefault();
          last.focus();
          return;
        }
        if (!event.shiftKey && (active === last || active === dialog)) {
          event.preventDefault();
          first.focus();
          return;
        }
      }

      if (event.key === "Escape" && escapeEnabled && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      if (event.key === "Enter" && enterEnabled && onEnter && !isEditableTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        onEnter();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [dialogRef, enterEnabled, escapeEnabled, id, isOpen, onEnter, onEscape]);
}
