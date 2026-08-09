import { useRef } from "react";
import type { ReactNode } from "react";
import { RailButton } from "../LiquidGlassSectionFrame";

export function SnapRail<T>({
  label,
  items,
  renderItem,
}: {
  label: string;
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const looping = items.length > 1;

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const distance = Math.max(220, rail.clientWidth * 0.72);
    const limit = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const next = rail.scrollLeft + direction * distance;
    const atStart = rail.scrollLeft <= 4;
    const atEnd = rail.scrollLeft >= limit - 4;
    const left =
      direction > 0
        ? atEnd
          ? 0
          : Math.min(limit, next)
        : atStart
          ? limit
          : Math.max(0, next);
    rail.scrollTo({
      left,
      behavior: "smooth",
    });
  };

  return (
    // The rail stays inside the shared glass section. Its track does not scroll
    // visibly — no bar, no drag and no stray sideways movement on a trackpad —
    // but `scrollTo` still gives the arrow controls their smooth motion.
    <div className="group/rail relative">
      <div
        ref={railRef}
        className={`flex snap-x snap-mandatory gap-3 overflow-hidden pb-1 sm:gap-4 ${looping ? "" : "justify-center"}`}
        dir="ltr"
      >
        {items.map((item, itemIndex) => (
          <div key={itemIndex} className="flex shrink-0 snap-center">
            {renderItem(item, itemIndex)}
          </div>
        ))}
      </div>

      {looping && (
        // Floating over the rail rather than parked beneath it: the controls
        // belong to the slides they move. Soft, translucent and blurred, so
        // they sit on a photo without covering it.
        <>
          <RailButton
            side="left"
            label={`${label} — پێشوو`}
            onClick={() => move(-1)}
          />
          <RailButton
            side="right"
            label={`${label} — دواتر`}
            onClick={() => move(1)}
          />
        </>
      )}
    </div>
  );
}
