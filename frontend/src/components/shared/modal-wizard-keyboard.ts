export function shouldAdvanceModalWizardOnEnter({
  key,
  shiftKey,
  target,
}: {
  key: string;
  shiftKey: boolean;
  target: EventTarget | null;
}): boolean {
  if (key !== "Enter" || target instanceof HTMLButtonElement) return false;
  if (target instanceof HTMLTextAreaElement && shiftKey) return false;
  return true;
}
