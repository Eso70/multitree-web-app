import { apiRequest } from "@/lib/api/request";

/** How a delivery problem is reported to the owner. */
export type TikTokDeliverySeverity = "permanent" | "retrying";

export interface TikTokDeliveryError {
  pixelId: string | null;
  destinationId: string;
  statusCode: number | null;
  severity: TikTokDeliverySeverity;
  message: string;
  attempts: number;
  events: number;
  permanentlyFailed: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface TikTokHealth {
  connections: number;
  /** Events whose pixel half fired in the browser. */
  browserEvents: number;
  /** Events queued for the Events API. */
  serverEvents: number;
  delivered: number;
  retrying: number;
  failed: number;
  deliveryRate: number;
  lastDeliveredAt: string | null;
}

export function getTikTokHealth(signal?: AbortSignal): Promise<TikTokHealth> {
  return apiRequest<TikTokHealth>("/api/analytics/v2/tiktok/health", {
    signal,
  });
}

/**
 * Recent delivery problems, grouped by pixel and message.
 *
 * Server-side only: these come from `marketing_delivery_attempts`, which is
 * what the Events API actually answered. A pixel that fails to load in a
 * visitor's browser leaves no durable record, so it is inferred from the health
 * counters instead of reported here.
 */
export function getTikTokDeliveryErrors(
  signal?: AbortSignal,
): Promise<{ items: TikTokDeliveryError[] }> {
  return apiRequest<{ items: TikTokDeliveryError[] }>(
    "/api/analytics/v2/tiktok/errors",
    { signal },
  );
}
