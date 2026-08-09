const DECORATION_LAYOUTS = [
  [
    { position: "left-[3%] top-[20%]", reverse: false },
    { position: "right-[4%] bottom-[17%]", reverse: true },
  ],
  [
    { position: "right-[3%] top-[15%]", reverse: true },
    { position: "left-[5%] bottom-[22%]", reverse: false },
  ],
  [
    { position: "left-[2%] top-[31%]", reverse: true },
    { position: "right-[6%] bottom-[12%]", reverse: false },
  ],
  [
    { position: "right-[4%] top-[24%]", reverse: false },
    { position: "left-[3%] bottom-[14%]", reverse: true },
  ],
  [
    { position: "left-[5%] top-[13%]", reverse: false },
    { position: "right-[2%] bottom-[26%]", reverse: true },
  ],
  [
    { position: "right-[5%] top-[33%]", reverse: true },
    { position: "left-[2%] bottom-[19%]", reverse: false },
  ],
] as const;

export function BusinessSectionDecorations({
  colors,
  labels,
  variant = 0,
}: {
  colors: readonly [string, string];
  labels: ReadonlyArray<string | null | undefined>;
  variant?: number;
}) {
  const decorations =
    DECORATION_LAYOUTS[
      Math.abs(Math.trunc(variant)) % DECORATION_LAYOUTS.length
    ];
  const visibleLabels = Array.from(
    new Set(labels.filter((label): label is string => Boolean(label?.trim()))),
  ).slice(0, decorations.length);

  if (visibleLabels.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {visibleLabels.map((label, index) => {
        const { position, reverse } = decorations[index];
        const color = colors[index];

        return (
          <span
            key={`${position}-${label}`}
            className={`absolute z-10 hidden h-9 max-w-44 items-center gap-2 rounded-lg border px-3 text-xs font-medium text-gray-700 shadow-xl [--decoration-surface:#fff] dark:text-white/75 dark:[--decoration-surface:#181a1c] xl:flex ${reverse ? "flex-row-reverse" : ""} ${position}`}
            style={{
              backgroundColor: `color-mix(in srgb, ${color} 11%, var(--decoration-surface))`,
              borderColor: `color-mix(in srgb, ${color} 32%, transparent)`,
              boxShadow: `0 12px 28px color-mix(in srgb, ${color} 13%, transparent)`,
            }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="truncate" dir="auto">
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
