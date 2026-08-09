import { Eye } from "lucide-react";
import type { Permission } from "./types";
import { Badge, riskLevelLabel } from "./SharedUI";

export function AccessTable({
  items,
  onPermission,
}: {
  items: Permission[];
  onPermission: (permission: Permission) => void;
}) {
  return (
    <div className="overflow-x-auto custom-scrollbar lime-custom-scrollbar">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-slate-400 dark:border-white/5">
            {[
              "کلیلی مۆڵەت",
              "پۆل",
              "پڕۆفایلەکان",
              "کردار",
              "مەترسی",
              "کارەکان",
            ].map((header) => (
              <th key={header} className="px-3 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((permission) => (
            <tr
              key={permission.id}
              className="border-b border-slate-100 text-slate-600 transition hover:bg-slate-50/60 dark:border-white/5 dark:text-slate-300 dark:hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3 font-mono font-semibold sa-accent-text">
                {permission.key}
              </td>
              <td className="px-3 py-3">{permission.category}</td>
              <td className="px-3 py-3">
                <div className="flex max-w-64 flex-wrap gap-1">
                  {permission.profiles.length ? (
                    permission.profiles.map((profile) => (
                      <span
                        key={profile}
                        className="rounded-full bg-lime-50 px-2 py-1 text-[9px] font-bold text-lime-700 dark:bg-lime-500/10 dark:text-lime-300"
                      >
                        {profile}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3">{permission.action}</td>
              <td className="px-3 py-3">
                <Badge
                  text={riskLevelLabel(permission.riskLevel)}
                  tone={
                    permission.riskLevel === "critical"
                      ? "red"
                      : permission.riskLevel === "sensitive"
                        ? "orange"
                        : "green"
                  }
                />
              </td>
              <td className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => onPermission(permission)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-50 dark:hover:bg-sky-500/10"
                  title="بینین"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
