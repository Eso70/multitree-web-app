import type { AdvertisingDraftConfig } from "@linktree/types";

/**
 * The editor's calls to its own endpoints.
 *
 * Kept out of the component so the save/publish seam is one place rather than
 * a fetch inlined at each call site.
 */

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function failureMessage(payload: Record<string, unknown>, fallback: string) {
  return typeof payload.message === "string" ? payload.message : fallback;
}

async function request(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<AdvertisingDraftConfig> {
  const response = await fetch(`/api/advertising${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(failureMessage(payload, fallbackMessage));
  return payload.data as AdvertisingDraftConfig;
}

export function fetchAdvertisingDraft(): Promise<AdvertisingDraftConfig> {
  return request("", { method: "GET" }, "نەتوانرا زانیارییەکان باربکرێن");
}

/**
 * Saves and publishes in one request.
 *
 * The editor's Save button is the page's primary publish path, so the two
 * happen together and the server does them in one transaction. As two calls,
 * a publish that failed after a successful save left the draft written and
 * visitors still on the previous content, with nothing in the UI saying so.
 *
 * A field that is absent is left alone; a field that is present replaces its
 * whole value.
 */
export function saveAndPublishAdvertising(
  patch: Record<string, unknown>,
): Promise<AdvertisingDraftConfig> {
  return request(
    "/save-and-publish",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
    "نەتوانرا پاشەکەوت بکرێت",
  );
}

/**
 * Makes the currently persisted draft live. Used by the Ads page's header
 * toggle, which is its separate publish control: the editor's Save still
 * publishes in the same request, and this endpoint lets the same state be
 * flipped without rewriting the draft.
 */
export function publishAdvertising(): Promise<AdvertisingDraftConfig> {
  return request("/publish", { method: "POST" }, "نەتوانرا بڵاوکرایەوە");
}

/** Takes the page down. Visitors get a 404 until it is published again. */
export function unpublishAdvertising(): Promise<AdvertisingDraftConfig> {
  return request("/unpublish", { method: "POST" }, "نەتوانرا وەستێنرێت");
}

/**
 * Uploads an image and returns its persisted URL. Replaces the `blob:` URLs the
 * editor used to keep, which died with the tab.
 */
export async function uploadAdvertisingImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/advertising/upload/image", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(failureMessage(payload, "نەتوانرا وێنەکە باربکرێت"));
  }
  const data = payload.data as { url?: unknown } | undefined;
  const url = typeof data?.url === "string" ? data.url : payload.url;
  if (typeof url !== "string") throw new Error("Upload URL is missing");
  return url;
}
