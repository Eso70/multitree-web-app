"use client";

/**
 * Required-field asterisk rendered in the tenant/accent color. Shared so every
 * form in the system marks required fields the same way.
 */
export function RequiredMark() {
  return (
    <span className="ml-1" style={{ color: "var(--theme-primary, #64748b)" }} aria-hidden>
      *
    </span>
  );
}
