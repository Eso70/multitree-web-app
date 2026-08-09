import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCardGrid } from "./StatCardGrid";

/**
 * Stat rows behave the same on every page.
 *
 * Twenty-one pages used to write their own grid and they had drifted: some
 * stacked one per row on a phone, some two; the breakpoint they widened at and
 * the gap between cards were different again. The same four numbers laid out
 * differently depending on which tab you opened.
 */

const SOURCE_ROOT = join(process.cwd(), "src");

function sourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, found);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.spec\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

describe("StatCardGrid", () => {
  it("is two columns before the desktop breakpoint", () => {
    const { container } = render(
      <StatCardGrid>
        <span />
      </StatCardGrid>,
    );
    const grid = container.firstElementChild;

    // Two on a phone and a tablet, always. A stat card is short and wide, so
    // one per row wastes the screen and pushes content below the fold.
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid?.className).not.toMatch(/\bsm:grid-cols-/);
    expect(grid?.className).not.toMatch(/\bmd:grid-cols-/);
  });

  it("widens only at lg, to the column count the row was designed for", () => {
    for (const columns of [2, 3, 4] as const) {
      const { container } = render(
        <StatCardGrid columns={columns}>
          <span />
        </StatCardGrid>,
      );
      expect(container.firstElementChild).toHaveClass(
        `lg:grid-cols-${columns}`,
      );
    }
  });

  it("keeps the caller's own spacing classes", () => {
    const { container } = render(
      <StatCardGrid className="mb-8">
        <span />
      </StatCardGrid>,
    );

    expect(container.firstElementChild).toHaveClass("mb-8");
  });

  it("is the only thing that lays out a row of stat cards", () => {
    const offenders = sourceFiles(SOURCE_ROOT)
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        if (!source.includes("<StatCard")) return [];
        const flat = source.replace(/\n\s*/g, " ");
        const wrappers = [
          ...flat.matchAll(
            /className="([^"]*\bgrid\b[^"]*)"[^>]*>\s*(?:\{[^}]*\}\s*)?<StatCard/g,
          ),
        ];
        // A `divide-*` wrapper is a different pattern: two `comparison` cards
        // sharing a rule rather than a row of stats. It is already two columns
        // at every width, and the rule between them only reads correctly with
        // no gap — which is exactly what this grid adds.
        return wrappers.some((match) => !match[1].includes("divide-"))
          ? [file.slice(SOURCE_ROOT.length + 1).split(/[\\/]/).join("/")]
          : [];
      });

    expect(offenders).toEqual([]);
  });
});
