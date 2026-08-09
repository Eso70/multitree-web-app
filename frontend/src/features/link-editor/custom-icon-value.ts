export interface UploadedIconValue {
  url: string;
  hasBackground: boolean;
}

const UPLOADED_ICON_PREFIX = "uploaded-image:";

export function encodeUploadedIconValue({
  url,
  hasBackground,
}: UploadedIconValue): string {
  return `${UPLOADED_ICON_PREFIX}${hasBackground ? "opaque" : "transparent"}:${url}`;
}

export function parseUploadedIconValue(
  value?: string | null,
): UploadedIconValue | null {
  if (!value?.startsWith(UPLOADED_ICON_PREFIX)) return null;
  const match = value.match(/^uploaded-image:(opaque|transparent):(.+)$/);
  if (!match?.[2] || !match[2].startsWith("/images/upload/")) return null;
  return {
    url: match[2],
    hasBackground: match[1] === "opaque",
  };
}

export async function imageHasOpaqueBackground(file: File): Promise<boolean> {
  if (file.type !== "image/png") return true;

  const bitmap = await createImageBitmap(file);
  try {
    const size = 96;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return true;
    context.clearRect(0, 0, size, size);
    context.drawImage(bitmap, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 250) return false;
    }
    return true;
  } finally {
    bitmap.close();
  }
}
