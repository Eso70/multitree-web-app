"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { UserRound } from "lucide-react";

export interface AvatarMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  divider?: boolean;
  onClick: () => void;
}

interface AvatarMenuProps {
  name?: string;
  email?: string;
  badge?: string;
  avatarSrc?: string | null;
  ariaLabel?: string;
  className?: string;
  panelClassName?: string;
  sizeClassName?: string;
  items: AvatarMenuItem[];
  onItemClick?: () => void;
}

export function AvatarMenu({
  name,
  email,
  badge,
  avatarSrc,
  ariaLabel = "Avatar menu",
  className = "",
  panelClassName = "",
  sizeClassName = "h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11",
  items,
  onItemClick,
}: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Show the real sign-in address or nothing. This used to synthesize
  // `<name>@example.com`, which renders as a plausible address the account does
  // not own — worse than an empty line, because it looks like real data.
  const displayEmail = email?.trim() || "";

  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node))
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const select = (item: AvatarMenuItem) => {
    setOpen(false);
    onItemClick?.();
    item.onClick();
  };

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={ariaLabel}
        aria-expanded={open}
        title={name}
        className={`group relative flex items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-gray-50 shadow-sm transition-all duration-300 hover:from-slate-100 hover:to-gray-100 hover:shadow dark:border-white/10 dark:from-white/5 dark:to-white/5 dark:hover:from-white/10 dark:hover:to-white/10 ${sizeClassName} ${className}`}
      >
        {avatarSrc ? (
          <Image
            src={avatarSrc}
            alt={name || "Avatar"}
            width={48}
            height={48}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-4 w-4 text-slate-400 sm:h-4 sm:w-4 md:h-5 md:w-5" />
        )}
      </button>

      {open && (
        <div
          className={`fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1c222b] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-72 ${panelClassName}`}
        >
          <div className="flex items-start gap-3 border-b border-slate-100 p-4 dark:border-white/5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt={name ?? "Avatar"}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-5 w-5 text-slate-400" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              {name && (
                <p className="truncate text-sm font-black text-slate-700 dark:text-slate-200">
                  {name}
                </p>
              )}
              {displayEmail && (
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {displayEmail}
                </p>
              )}
            </div>
            {badge && (
              <span className="flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background:
                    "color-mix(in srgb, var(--theme-primary, #64748b) 9%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--theme-primary, #64748b) 22%, transparent)",
                  color: "var(--theme-primary, #64748b)",
                }}
              >
                {badge}
              </span>
            )}
          </div>

          <div className="p-1.5">
            {items.map((item) =>
              item.divider ? (
                <div
                  key={item.id}
                  role="separator"
                  className="my-1 border-t border-slate-100 dark:border-white/5"
                />
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    item.danger
                      ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-gray-100"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}