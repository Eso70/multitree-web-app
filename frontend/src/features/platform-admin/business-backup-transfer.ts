async function responseMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return typeof payload?.message === "string" ? payload.message : fallback;
}

export async function downloadBusinessBackup(
  url: string,
  fallbackFilename: string,
) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(await responseMessage(response, "Export failed"));
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename =
    disposition.match(/filename="?([^";]+)"?/i)?.[1] || fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export async function uploadBusinessBackup(url: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(
      typeof payload?.message === "string" ? payload.message : "Import failed",
    );
  }
  return payload?.data as unknown;
}
