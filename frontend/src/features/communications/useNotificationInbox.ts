"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { usePolling } from "@/lib/utils/usePolling";
import { communicationRequest } from "./api";
import type { NotificationInbox } from "./types";

const EMPTY_INBOX: NotificationInbox = { items: [], unreadCount: 0 };

export function useNotificationInbox(endpointBase: string) {
  const [inbox, setInbox] = useState<NotificationInbox>(EMPTY_INBOX);
  const [loading, setLoading] = useState(true);
  const lastInboxRef = useRef("");

  const load = useCallback(
    async (rethrow = false) => {
      try {
        const notifications = await communicationRequest<NotificationInbox>(
          `${endpointBase}/notifications`,
        );
        const serialized = JSON.stringify(notifications);
        if (serialized !== lastInboxRef.current) {
          lastInboxRef.current = serialized;
          setInbox(notifications);
        }
      } catch (error) {
        if (rethrow) throw error;
      } finally {
        setLoading(false);
      }
    },
    [endpointBase],
  );

  usePolling(load, 20_000);

  const read = useCallback(
    async (id: string) => {
      try {
        await communicationRequest(`${endpointBase}/notifications/${id}/read`, {
          method: "PATCH",
        });
        setInbox((current) => ({
          unreadCount: Math.max(
            0,
            current.unreadCount -
              (current.items.find((item) => item.id === id)?.readAt ? 0 : 1),
          ),
          items: current.items.map((item) =>
            item.id === id
              ? { ...item, readAt: item.readAt || new Date().toISOString() }
              : item,
          ),
        }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "نوێکردنەوە سەرکەوتوو نەبوو",
        );
        throw error;
      }
    },
    [endpointBase],
  );

  const dismiss = useCallback(
    async (id: string) => {
      try {
        await communicationRequest(`${endpointBase}/notifications/${id}`, {
          method: "DELETE",
        });
        setInbox((current) => ({
          unreadCount: Math.max(
            0,
            current.unreadCount -
              (current.items.find((item) => item.id === id)?.readAt ? 0 : 1),
          ),
          items: current.items.filter((item) => item.id !== id),
        }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "سڕینەوە سەرکەوتوو نەبوو",
        );
        throw error;
      }
    },
    [endpointBase],
  );

  const markAllRead = useCallback(async () => {
    try {
      await communicationRequest(`${endpointBase}/notifications/read-all`, {
        method: "PATCH",
      });
      setInbox((current) => ({
        unreadCount: 0,
        items: current.items.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
      }));
    } catch (error) {
      toast.error("نوێکردنەوە سەرکەوتوو نەبوو");
      throw error;
    }
  }, [endpointBase]);

  const deleteAll = useCallback(async () => {
    try {
      await communicationRequest(`${endpointBase}/notifications`, {
        method: "DELETE",
      });
      setInbox(EMPTY_INBOX);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "سڕینەوەی هەمووی سەرکەوتوو نەبوو",
      );
      throw error;
    }
  }, [endpointBase]);

  return {
    inbox,
    loading,
    load,
    read,
    dismiss,
    markAllRead,
    deleteAll,
  };
}
