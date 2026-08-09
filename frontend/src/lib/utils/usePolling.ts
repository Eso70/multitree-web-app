"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `task` on an interval, with the behavior polling in this app kept
 * getting wrong:
 *
 * - **Paused while the tab is hidden.** A background tab has no one looking at
 *   it, so ticking there only burns battery and server capacity.
 * - **Refreshed the moment the tab comes back**, so returning to it shows
 *   current data immediately rather than after a full interval.
 * - **Never overlapping.** A slow response cannot pile up behind the next tick
 *   and turn a 5s poll into a request queue.
 * - **Stable across re-renders.** The task is read from a ref, so the timer is
 *   not torn down and rebuilt whenever the caller re-renders.
 */
export function usePolling(
  task: () => Promise<void> | void,
  intervalMs: number,
  { enabled = true, immediate = true }: { enabled?: boolean; immediate?: boolean } = {},
) {
  const taskRef = useRef(task);
  // Assigned in an effect rather than during render: mutating a ref while
  // rendering is unsafe once React renders concurrently.
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let disposed = false;
    let running = false;

    const run = async () => {
      if (disposed || running || document.hidden) return;
      running = true;
      try {
        await taskRef.current();
      } finally {
        running = false;
      }
    };

    const runWhenVisible = () => {
      if (!document.hidden) void run();
    };

    if (immediate) void run();
    const timer = window.setInterval(() => void run(), intervalMs);
    window.addEventListener("focus", runWhenVisible);
    document.addEventListener("visibilitychange", runWhenVisible);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", runWhenVisible);
      document.removeEventListener("visibilitychange", runWhenVisible);
    };
  }, [enabled, immediate, intervalMs]);
}
