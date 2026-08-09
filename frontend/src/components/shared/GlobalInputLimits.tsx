"use client";

import { useEffect } from "react";

/**
 * A backstop `maxlength` for inputs that do not declare their own.
 *
 * A field whose real limit matters should say so in its own JSX — that value
 * belongs beside the DTO it has to satisfy, and this cannot know it. What this
 * provides is the floor: no input anywhere accepts an unbounded paste.
 *
 * The writes are deliberately deferred. React hydrates a route by matching its
 * own expected props against the live DOM, so an attribute added to a node in
 * the moment between it being inserted and being hydrated is seen as a
 * server/client mismatch and logged as a hydration error. Setting the
 * attribute a frame later puts every write after the commit that would have
 * compared it.
 */

const INPUT_LIMITS: Record<string, number> = {
  text: 255,
  search: 120,
  email: 254,
  url: 2048,
  tel: 32,
  password: 256,
};

const TEXTAREA_LIMIT = 5000;

function applyStandardLimit(element: Element) {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement)
  )
    return;
  // An explicit limit always wins, and `data-unlimited` is the opt-out for a
  // field that genuinely takes long text.
  if (element.hasAttribute("maxlength") || element.dataset.unlimited === "true")
    return;

  if (element instanceof HTMLTextAreaElement) {
    element.maxLength = TEXTAREA_LIMIT;
    return;
  }

  const limit = INPUT_LIMITS[element.type];
  if (limit) element.maxLength = limit;
}

export function GlobalInputLimits() {
  useEffect(() => {
    let frame = 0;
    const pending = new Set<Element>();

    const flush = () => {
      frame = 0;
      const nodes = [...pending];
      pending.clear();
      for (const node of nodes) {
        // Re-checked at flush time: a node observed a frame ago may have been
        // removed since, and React may have set its own limit in between.
        if (node.isConnected) applyStandardLimit(node);
      }
    };

    const schedule = (element: Element) => {
      pending.add(element);
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const scheduleWithin = (root: ParentNode) => {
      root.querySelectorAll("input, textarea").forEach(schedule);
    };

    scheduleWithin(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          schedule(node);
          scheduleWithin(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
