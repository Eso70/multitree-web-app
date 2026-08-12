"use client";

import { memo } from "react";

export type TemplateDecorationVariant =
  | "spectrum"
  | "spotlight"
  | "frost"
  | "aurora"
  | "serenity";

export const TemplateBackdropDecorations = memo(
  function TemplateBackdropDecorations({
    variant,
    accentColor,
    secondaryColor = accentColor,
  }: {
    variant: TemplateDecorationVariant;
    accentColor: string;
    secondaryColor?: string;
  }) {
    const accentWash = `color-mix(in srgb, ${accentColor} 18%, transparent)`;
    const accentLine = `color-mix(in srgb, ${accentColor} 30%, transparent)`;
    const secondaryWash = `color-mix(in srgb, ${secondaryColor} 14%, transparent)`;

    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
        data-template-decoration={variant}
      >
        {variant === "spectrum" ? (
          <>
            <div
              className="absolute -right-16 top-16 h-48 w-48 rounded-full blur-3xl"
              style={{ background: accentWash }}
            />
            <div
              className="absolute -left-10 bottom-24 h-32 w-32 rounded-full border-2"
              style={{ borderColor: accentLine }}
            />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `radial-gradient(${accentLine} 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
                maskImage: "linear-gradient(to bottom, black, transparent 45%)",
              }}
            />
          </>
        ) : null}

        {variant === "spotlight" ? (
          <>
            <div
              className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: accentWash }}
            />
            <div
              className="absolute inset-x-8 top-8 h-40 rounded-[2.5rem] border"
              style={{ borderColor: accentLine }}
            />
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(${accentLine} 1px, transparent 1px), linear-gradient(90deg, ${accentLine} 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
                maskImage: "linear-gradient(to bottom, black, transparent 52%)",
              }}
            />
          </>
        ) : null}

        {variant === "frost" ? (
          <>
            <div
              className="absolute -right-20 top-20 h-52 w-52 rounded-full border"
              style={{ borderColor: accentLine }}
            />
            <div
              className="absolute -right-10 top-28 h-32 w-32 rounded-full border"
              style={{ borderColor: accentLine }}
            />
            <div
              className="absolute -left-24 bottom-16 h-48 w-48 rounded-full blur-3xl"
              style={{ background: secondaryWash }}
            />
          </>
        ) : null}

        {variant === "aurora" ? (
          <>
            <div
              className="absolute left-6 top-20 h-2 w-2 rounded-full shadow-[0_0_18px_currentColor]"
              style={{ color: accentColor, background: accentColor }}
            />
            <div
              className="absolute right-10 top-40 h-1.5 w-1.5 rounded-full shadow-[0_0_16px_currentColor]"
              style={{ color: secondaryColor, background: secondaryColor }}
            />
            <div
              className="absolute -left-20 top-1/3 h-48 w-48 rounded-full border"
              style={{ borderColor: accentLine }}
            />
            <div
              className="absolute -right-24 bottom-20 h-56 w-56 rounded-full blur-3xl"
              style={{ background: secondaryWash }}
            />
          </>
        ) : null}

        {variant === "serenity" ? (
          <>
            <div
              className="absolute -left-20 top-10 h-56 w-56 rounded-full blur-3xl"
              style={{ background: accentWash }}
            />
            <div
              className="absolute -right-20 bottom-16 h-64 w-64 rounded-full blur-3xl"
              style={{ background: secondaryWash }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-[38%_62%_55%_45%] border"
              style={{ borderColor: accentLine }}
            />
          </>
        ) : null}
      </div>
    );
  },
);
