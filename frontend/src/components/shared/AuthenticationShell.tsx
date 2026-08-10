import { ArrowLeft } from "lucide-react";
import { AuthenticationPreviewPanel } from "@/components/shared/AuthenticationPreviewPanel";
import { ThemeToggleButton } from "@/components/shared/ThemeToggleButton";
import { parseWebsiteColor, readableInk } from "@/lib/utils/parse-website-color";

interface AuthenticationShellProps {
  children: React.ReactNode;
  brandDescription: string;
  backHref?: string;
  wide?: boolean;
  headerAction?: React.ReactNode;
  brandName?: string;
  brandLogo?: string | null;
  accentColor?: string | null;
}

export function AuthenticationShell({
  children,
  brandDescription,
  backHref = "/",
  wide = false,
  headerAction,
  brandName = "MultiTree",
  brandLogo,
  accentColor,
}: AuthenticationShellProps) {
  const controlClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/85 text-slate-500 shadow-sm backdrop-blur transition hover:text-slate-900 dark:border-white/10 dark:bg-[#171a20]/90 dark:text-slate-400 dark:hover:text-white";
  const accent = accentColor ? parseWebsiteColor(accentColor) : null;
  const themeStyle = accent
    ? ({
        "--business-website-color": accent.primary,
        "--theme-primary": accent.primary,
        "--theme-css": accent.css,
        "--multitree-accent": accent.primary,
        "--multitree-accent-ink": readableInk(accent.primary),
        "--multitree-accent-hover": `color-mix(in srgb, ${accent.primary} 86%, black)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main
      data-multitree-theme={accent ? undefined : true}
      className={`${accent ? "custom-scrollbar theme-custom-scrollbar" : ""} relative h-screen overflow-hidden bg-[#f7f8fa] text-slate-900 transition-colors dark:bg-[#0d0f12] dark:text-white`}
      style={themeStyle}
    >
      <a
        href={backHref}
        className={`${controlClass} absolute left-5 top-5 z-20 sm:left-8 sm:top-8`}
        aria-label="Back"
      >
        <ArrowLeft className="h-4.5 w-4.5" />
      </a>
      <div className="absolute right-5 top-5 z-20 flex items-center gap-2 sm:right-8 sm:top-8">
        {headerAction}
        <ThemeToggleButton />
      </div>
      <div className="grid h-full w-full lg:grid-cols-[minmax(0,1fr)_1.4fr]">
        <section className="flex h-full flex-col px-5 py-5 sm:px-8 sm:py-8 lg:px-10 xl:px-14">
          <div className="flex flex-1 items-center justify-center py-2 lg:py-4">
            <div className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"}`}>
              {children}
            </div>
          </div>
        </section>
        <AuthenticationPreviewPanel
          description={brandDescription}
          brandName={brandName}
          brandLogo={brandLogo}
        />
      </div>
    </main>
  );
}
