import { useEffect, useRef, useState } from "react";

/**
 * Defers mounting until the element scrolls near the viewport, so heavy
 * previews (template renders, embedded pages) don't all mount at once.
 *
 * `rootMargin` widens or narrows the reveal window: a tight margin mounts just
 * before the element is visible, a large one prefetches content well before it
 * scrolls into view.
 */
export function useNearViewport<T extends HTMLElement = HTMLDivElement>({
  rootMargin = "80px",
}: { rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isNear) return;

    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setIsNear(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsNear(true);
        observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isNear, rootMargin]);

  return { ref, isNear };
}
