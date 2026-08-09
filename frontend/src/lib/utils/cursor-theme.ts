import { MULTITREE_ACCENT_COLOR } from "@/lib/multitree-theme";

let cursorAssetsPromise: Promise<[string, string]> | null = null;

function loadCursorAssets(): Promise<[string, string]> {
  cursorAssetsPromise ??= Promise.all([
    fetch("/cursors/customCursor.svg").then((response) => response.text()),
    fetch("/cursors/customTextSelect.svg").then((response) => response.text()),
  ]);
  return cursorAssetsPromise;
}

export async function applyCursorColor(
  accentColor: string,
  root: HTMLElement = document.documentElement,
  isActive: () => boolean = () => true,
): Promise<void> {
  const [defaultCursor, textCursor] = await loadCursorAssets();
  if (!isActive()) return;
  const tint = (svg: string) =>
    encodeURIComponent(svg.replaceAll(MULTITREE_ACCENT_COLOR, accentColor));

  root.style.setProperty(
    "--custom-cursor-default",
    `url("data:image/svg+xml,${tint(defaultCursor)}") 10 2, default`,
  );
  root.style.setProperty(
    "--custom-cursor-text",
    `url("data:image/svg+xml,${tint(textCursor)}") 16 16, text`,
  );
}

export function resetCursorColor(
  root: HTMLElement = document.documentElement,
): void {
  root.style.removeProperty("--custom-cursor-default");
  root.style.removeProperty("--custom-cursor-text");
}
