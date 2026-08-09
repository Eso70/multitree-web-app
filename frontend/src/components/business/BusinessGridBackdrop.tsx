import { cn } from "@/lib/utils";

interface BusinessGridBackdropProps {
  className?: string;
  mask?: string;
}

export function BusinessGridBackdrop({
  className,
  mask = "linear-gradient(to bottom, black 0%, black 75%, transparent 100%)",
}: BusinessGridBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        maskImage: mask,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, currentColor 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, currentColor 9%, transparent) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}
