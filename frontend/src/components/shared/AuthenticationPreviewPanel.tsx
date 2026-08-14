import Image from "next/image";
import { BUSINESS_LOGO_PLACEHOLDER } from "@/lib/brand/brand-assets";

interface AuthenticationPreviewPanelProps {
  description: string;
  brandName?: string;
  brandLogo?: string | null;
}

export function AuthenticationPreviewPanel({
  description,
  brandName = "MultiTree",
  brandLogo,
}: AuthenticationPreviewPanelProps) {
  return (
    <aside className="relative hidden min-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[32px] bg-[var(--multitree-accent)] p-10 lg:flex lg:items-center lg:justify-center lg:ml-4 lg:mr-[-2.5rem] lg:min-h-[calc(100vh-2rem)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,.5),transparent_28%),linear-gradient(145deg,transparent,rgba(15,23,42,.1))]" />
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-slate-900/10" />
      <div className="absolute -bottom-28 -left-20 h-96 w-96 rounded-full border border-slate-900/10" />
      <div className="relative max-w-md text-center text-white" dir="rtl">
        <div className="mx-auto h-20 w-20 overflow-hidden rounded-3xl border border-white/50 bg-white/85 p-1.5 shadow-[0_20px_45px_rgba(15,23,42,.18)]">
          <Image
            src={brandLogo || BUSINESS_LOGO_PLACEHOLDER}
            alt={brandName}
            width={80}
            height={80}
            className="h-full w-full rounded-[18px] object-cover"
          />
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-white/75">
          {brandName}
        </p>
        <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight">
          {brandName === "MultiTree" ? "پانێڵی پلاتفۆڕم" : "پانێڵی بزنس"}
        </h2>
        <p className="mx-auto mt-5 max-w-sm text-sm font-medium leading-7 text-white/85">
          {description}
        </p>
        <div className="mx-auto mt-8 h-1.5 w-20 rounded-full bg-slate-950/15" />
      </div>
    </aside>
  );
}
