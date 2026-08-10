import "@testing-library/jest-dom/vitest";

/**
 * Browser observer APIs that jsdom does not implement.
 *
 * Components that measure or lazily reveal themselves construct these in an
 * effect, so rendering one under jsdom throws `X is not defined` and the test
 * fails for a reason that has nothing to do with what it asserts. Stubbing them
 * globally keeps that noise out of every individual spec.
 *
 * These are inert on purpose: they never fire a callback. A test that needs
 * resize or intersection behaviour should drive it explicitly rather than rely
 * on a fake observer deciding when to run.
 */

class InertObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver =
    InertObserver as unknown as typeof globalThis.ResizeObserver;
}

if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver =
    InertObserver as unknown as typeof globalThis.IntersectionObserver;
}

// jsdom has no layout engine, so this is absent; several UI components call it
// when scrolling a newly selected item into view.
//
// Guarded on `Element` itself because this setup file also runs for specs that
// opt into the node environment, where none of the DOM globals exist.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// Used by responsive components; jsdom ships no implementation at all.
if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}
