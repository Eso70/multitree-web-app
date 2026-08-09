import type { ReactNode } from "react";
import { LockKeyhole, type LucideIcon } from "lucide-react";

export interface LockedNoticeProps {
  title?: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
  footer?: ReactNode;
}

export function LockedNotice({
  title = "ئەم تایبەتمەندییە لە پلانی ئێستاتدا بەردەست نییە",
  description,
  icon: Icon = LockKeyhole,
  compact = false,
  className = "",
  footer,
}: LockedNoticeProps) {
  return (
    <div
      className={`w-full rounded-3xl border bg-white text-center shadow-2xl dark:bg-[#1c222b] ${
        compact ? "max-w-sm p-5" : "max-w-md p-6 sm:p-8"
      } ${className}`}
      style={{
        borderColor:
          "color-mix(in srgb, var(--theme-primary) 35%, transparent)",
      }}
      role="status"
    >
      <div
        className={`mx-auto flex items-center justify-center rounded-2xl border ${
          compact ? "h-12 w-12" : "h-14 w-14"
        }`}
        style={{
          background:
            "color-mix(in srgb, var(--theme-primary) 14%, transparent)",
          borderColor:
            "color-mix(in srgb, var(--theme-primary) 30%, transparent)",
          color: "var(--theme-primary)",
        }}
      >
        <Icon className={compact ? "h-6 w-6" : "h-7 w-7"} />
      </div>
      <h2
        className={`font-bold text-slate-700 dark:text-slate-100 ${
          compact ? "mt-3 text-base" : "mt-4 text-lg"
        }`}
      >
        {title}
      </h2>
      <p
        className={`text-slate-500 dark:text-slate-400 ${
          compact
            ? "mt-1.5 text-xs leading-5"
            : "mt-2 text-sm leading-6"
        }`}
      >
        {description}
      </p>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </div>
  );
}

export interface LockedContentProps extends LockedNoticeProps {
  locked: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  noticeClassName?: string;
  placement?: "center" | "top";
  blurClassName?: string;
  opacityClassName?: string;
  lockOverflow?: boolean;
  constrainWhenLocked?: boolean;
  lockedHeightClassName?: string;
}

export function LockedContent({
  locked,
  children,
  className = "",
  contentClassName = "",
  overlayClassName = "",
  noticeClassName = "",
  placement = "center",
  blurClassName = "blur-[1px]",
  opacityClassName = "opacity-70",
  lockOverflow = true,
  constrainWhenLocked = true,
  lockedHeightClassName = "h-[min(620px,calc(100dvh-12rem))] min-h-[420px]",
  title,
  description,
  icon,
  compact,
  footer,
}: LockedContentProps) {
  return (
    <div
      className={`relative ${
        locked && lockOverflow ? "overflow-hidden" : ""
      } ${
        locked && constrainWhenLocked ? lockedHeightClassName : ""
      } ${className}`}
    >
      <div
        className={`${contentClassName} ${
          locked
            ? `pointer-events-none select-none ${blurClassName} ${opacityClassName}`
            : ""
        }`}
        aria-hidden={locked || undefined}
      >
        {children}
      </div>
      {locked ? (
        <div
          className={`absolute inset-0 z-20 flex justify-center rounded-2xl bg-slate-50/55 p-5 backdrop-blur-[1px] dark:bg-[#161B22]/60 ${
            placement === "top" ? "items-start pt-10" : "items-center"
          } ${overlayClassName}`}
        >
          <LockedNotice
            title={title}
            description={description}
            icon={icon}
            compact={compact}
            footer={footer}
            className={noticeClassName}
          />
        </div>
      ) : null}
    </div>
  );
}

export interface LockedItemOverlayProps {
  label?: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
  roundedClassName?: string;
}

export function LockedItemOverlay({
  label = "لە پلانی ئێستاتدا بەردەست نییە",
  icon: Icon = LockKeyhole,
  compact = false,
  className = "",
  roundedClassName = "rounded-2xl",
}: LockedItemOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px] ${roundedClassName} ${
        compact ? "p-1.5" : "p-5"
      } ${className}`}
    >
      <div
        className={`border border-white/15 bg-slate-950/80 text-center text-white shadow-2xl ${
          compact ? "max-w-32 rounded-xl p-2" : "max-w-40 rounded-2xl p-3"
        }`}
      >
        <Icon className={`mx-auto ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        <p
          className={`font-bold leading-tight ${
            compact ? "mt-1 text-[9px]" : "mt-1.5 text-[10px]"
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
