import { MapPin, Phone, Store } from "lucide-react";
import { SectionFrame } from "../LiquidGlassSectionFrame";
import { SWISS_ACCENT, safeUrl } from "../liquid-glass-utils";
import { records } from "./section-utils";

export function BranchesSection({
  value,
  interactive,
  ...frame
}: {
  value: string;
  interactive: boolean;
  fullPage: boolean;
  accent: string;
}) {
  const items = records(value);
  if (!items.length) return null;
  return (
    <SectionFrame title="لقەکان" icon={Store} {...frame}>
      <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        {items.map((item, index) => (
          <article
            key={`${item.raw}-${index}`}
            className="border-l-2 py-1 pl-5"
            style={{ borderColor: SWISS_ACCENT }}
          >
            <span
              className="text-[10px] font-black tracking-[0.2em]"
              style={{ color: SWISS_ACCENT }}
            >
              لقی {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-sm font-black sm:text-base" dir="auto">
              {item.title}
            </h3>
            <p className="mt-2 text-xs leading-6 opacity-60" dir="auto">
              {item.detail}
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              {item.third && (
                <a
                  href={interactive ? `tel:${item.third}` : undefined}
                  className="mini-glass-action inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black"
                >
                  <Phone className="h-3.5 w-3.5" />
                  پەیوەندی
                </a>
              )}
              {safeUrl(item.fourth) && (
                <a
                  href={interactive ? item.fourth : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mini-glass-action inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-black"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  ئاراستەکان
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}
