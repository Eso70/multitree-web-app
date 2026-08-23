/**
 * Resolve the declared type for a stored upload.
 *
 * SVG is intentionally absent because it can execute script when served as
 * same-origin content. Unknown extensions stay inert with `nosniff`.
 */
export function getUploadContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    bmp: "image/bmp",
  };

  return contentTypes[extension] || "application/octet-stream";
}
