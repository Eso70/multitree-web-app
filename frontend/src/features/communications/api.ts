import { apiRequest } from "@/lib/api/request";

export async function communicationRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return apiRequest<T>(url, { ...init, headers });
}
