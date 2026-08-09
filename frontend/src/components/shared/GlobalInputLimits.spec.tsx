import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalInputLimits } from "./GlobalInputLimits";

/**
 * The backstop must never write during hydration.
 *
 * React hydrates by matching its own expected props against the live DOM, so
 * an attribute added to a node in the window between it being inserted and
 * being hydrated reads as a server/client mismatch. That is what this used to
 * do — a `MutationObserver` set `maxlength` synchronously as nodes appeared —
 * and it logged a hydration error on any route whose inputs hydrated after the
 * observer was running.
 */

function flushFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("GlobalInputLimits", () => {
  it("does not touch an input synchronously", async () => {
    const input = document.createElement("input");
    input.type = "text";
    document.body.appendChild(input);

    render(<GlobalInputLimits />);

    // The frame the effect ran in is the frame React would have been
    // hydrating in. Nothing may be written yet.
    expect(input.hasAttribute("maxlength")).toBe(false);

    await flushFrame();
    expect(input.getAttribute("maxlength")).toBe("255");
  });

  it("applies the limit for the input's own type", async () => {
    const password = document.createElement("input");
    password.type = "password";
    const area = document.createElement("textarea");
    document.body.append(password, area);

    render(<GlobalInputLimits />);
    await flushFrame();

    expect(password.getAttribute("maxlength")).toBe("256");
    expect(area.getAttribute("maxlength")).toBe("5000");
  });

  it("leaves an explicit limit and an opted-out field alone", async () => {
    const declared = document.createElement("input");
    declared.type = "text";
    declared.setAttribute("maxlength", "120");
    const unlimited = document.createElement("textarea");
    unlimited.dataset.unlimited = "true";
    document.body.append(declared, unlimited);

    render(<GlobalInputLimits />);
    await flushFrame();

    // A field that states its own limit knows the DTO it has to satisfy; this
    // only ever supplies a floor for fields that say nothing.
    expect(declared.getAttribute("maxlength")).toBe("120");
    expect(unlimited.hasAttribute("maxlength")).toBe(false);
  });

  it("picks up inputs added after mount", async () => {
    render(<GlobalInputLimits />);
    await flushFrame();

    const later = document.createElement("input");
    later.type = "email";
    document.body.appendChild(later);
    await flushFrame();
    await flushFrame();

    expect(later.getAttribute("maxlength")).toBe("254");
  });
});
