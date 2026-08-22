"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The logical viewport every device preview renders on: a real phone's CSS
 * pixel size, not the size of the decorative frame around it.
 */
export const DEVICE_VIEWPORT_WIDTH = 390;
export const DEVICE_VIEWPORT_HEIGHT = 858;

interface DeviceViewportProps {
  children: ReactNode;
  /**
   * Lets a page taller than the screen scroll rather than being cut off. On by
   * default: a preview that hides half a mini website is worse than one the
   * reader can scroll.
   */
  scrollable?: boolean;
  /**
   * Build the nested document only once the frame is worth paying for. The
   * catalog passes its near-viewport flag so five previews do not each clone
   * the stylesheet set on load.
   */
  active?: boolean;
  title: string;
  className?: string;
  bodyClassName?: string;
}

/**
 * A real nested browser viewport, scaled into whatever space it is given.
 *
 * Scaling a `div` with `zoom` or `transform` does **not** change the viewport
 * that `@media` evaluates against, so a template written with Tailwind's
 * `sm:`/`lg:` prefixes rendered its *desktop* layout inside the phone whenever
 * the dashboard itself was wide. The old fix was a growing list of `!important`
 * overrides in `globals.css` that re-shrank fonts, avatars and grids — which
 * made the preview a drawing of a phone rather than a phone.
 *
 * An iframe is the only element that carries its own viewport, so inside this
 * one `390px` is genuinely `100vw`: media queries, `svh` units and sticky
 * headers all resolve exactly as they do on the device.
 *
 * The children are *portalled* rather than serialized into the frame, so React
 * context, live editor drafts and event handlers cross the boundary intact.
 */
export function DeviceViewport({
  children,
  scrollable = true,
  active = true,
  title,
  className = "",
  bodyClassName = "",
}: DeviceViewportProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  // Cloned `<link>` stylesheets refetch inside the frame, so a production build
  // would paint the page unstyled for a frame or two. Held hidden until they
  // resolve; inline `<style>` clones carry their text and settle immediately.
  const [stylesReady, setStylesReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !active) return;

    // `about:blank` documents are same-origin and are ready synchronously in
    // every browser this app supports, but a frame that has not been attached
    // yet reports a null document — bail and let the next render try.
    const doc = frame.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();

    const mount = doc.createElement("div");
    mount.className = "phone-mockup-canvas";
    doc.body.appendChild(mount);

    // The iframe is its own document: it inherits neither the app's compiled
    // stylesheet nor the custom properties the theme provider writes onto the
    // host `<html>`. Both are copied in, and kept copied, so a preview repaints
    // when the business accent or the dark-mode class changes.
    const syncStyles = () => {
      const head = doc.head;
      if (!head) return;
      head.querySelectorAll("[data-device-viewport-style]").forEach((node) =>
        node.remove(),
      );
      let pending = 0;
      const settle = () => {
        pending -= 1;
        if (pending <= 0) setStylesReady(true);
      };
      document
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((node) => {
          const copy = node.cloneNode(true) as HTMLElement;
          copy.setAttribute("data-device-viewport-style", "");
          if (copy instanceof HTMLLinkElement) {
            pending += 1;
            copy.addEventListener("load", settle, { once: true });
            copy.addEventListener("error", settle, { once: true });
          }
          head.appendChild(copy);
        });
      if (pending === 0) setStylesReady(true);

      const base = doc.createElement("style");
      base.setAttribute("data-device-viewport-style", "");
      // The frame supplies the height chain a preview's `min-h-full` needs,
      // and hides the scrollbar track so the hardware screen stays clean.
      base.textContent = `
        html, body { height: 100%; margin: 0; padding: 0; background: transparent; }
        body { overflow-x: hidden; overflow-y: ${scrollable ? "auto" : "hidden"}; }
        body::-webkit-scrollbar { width: 5px; }
        body::-webkit-scrollbar-thumb { border-radius: 999px; background: var(--theme-primary, #b6f20d); }
        /* Short pages fill the screen, tall ones grow and scroll: either way
           the page is drawn whole, never cropped to the frame. */
        .phone-mockup-canvas { min-height: 100%; width: 100%; }
      `;
      head.appendChild(base);
    };

    const syncRoot = () => {
      const host = document.documentElement;
      doc.documentElement.className = host.className;
      doc.documentElement.setAttribute("style", host.getAttribute("style") || "");
      const theme = host.getAttribute("data-theme");
      if (theme) doc.documentElement.setAttribute("data-theme", theme);
      doc.body.className = bodyClassName;
      doc.body.style.overscrollBehavior = "contain";
      doc.body.style.touchAction = scrollable ? "pan-y" : "none";
    };

    syncStyles();
    syncRoot();
    setMountNode(mount);

    // Styles arrive after mount during development hot reloads, and the theme
    // provider rewrites the host `<html>` style attribute whenever the accent
    // changes.
    const headObserver = new MutationObserver(syncStyles);
    headObserver.observe(document.head, { childList: true, subtree: true });
    const rootObserver = new MutationObserver(syncRoot);
    rootObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => {
      headObserver.disconnect();
      rootObserver.disconnect();
      setMountNode(null);
      setStylesReady(false);
    };
  }, [scrollable, bodyClassName, active]);

  // The hardware still paints while the viewport is idle, so a catalog of
  // frames looks the same whether or not their pages have been built yet.
  if (!active) return null;

  return (
    <>
      <iframe
        ref={frameRef}
        title={title}
        // The frame is laid out at the device's own size and scaled from its
        // top-left corner, so `100cqw` of hardware screen shows exactly
        // `DEVICE_VIEWPORT_WIDTH` CSS pixels of page.
        className={`absolute left-0 top-0 origin-top-left border-0 ${className}`}
        style={{
          width: `${DEVICE_VIEWPORT_WIDTH}px`,
          height: `${DEVICE_VIEWPORT_HEIGHT}px`,
          transform: `scale(calc(100cqw / ${DEVICE_VIEWPORT_WIDTH}px))`,
          opacity: stylesReady ? 1 : 0,
          transition: "opacity 150ms ease",
        }}
      />
      {mountNode ? createPortal(children, mountNode) : null}
    </>
  );
}
