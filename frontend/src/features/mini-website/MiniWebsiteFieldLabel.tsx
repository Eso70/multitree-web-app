import type { ReactNode } from "react";

const SHORT_LABELS: Record<string, string> = {
  "ناوی مینی وێبسایت": "ناو",
  "لینکی تایبەتی خۆکار": "لینک",
  "ناوی پیشاندراو": "ناو",
  "ناوی هەژمار یان وەرگر": "ناوی هەژمار",
  "ژمارەی جزدان، تەلەفۆن یان هەژمار": "ژمارەی هەژمار",
  "ڕێنمایی پارەدان": "ڕێنمایی",
  "لۆگۆی دابینکەر": "لۆگۆ",
  "ناونیشانی ئۆفەر": "ناونیشان",
  "نرخی سەرەتایی": "نرخی پێشوو",
  "بەرواری بەسەرچوون": "بەسەرچوون",
  "ناونیشانی ڕووداو": "ناونیشان",
  "شوێن یان پلاتفۆرمی ئۆنلاین": "شوێن",
  "لینکی تۆمارکردن": "لینک",
  "وێنەی ڕووداو": "وێنە",
  "لینکی دەنگ یان ئەڵقە": "لینک",
  "ناونیشانی خاڵی بەهێز": "ناونیشان",
  "ناونیشانی بەڵگەنامە": "ناونیشان",
  "وردەکاری بەڵگەنامە": "وردەکاری",
  "لینکی HTTPS بۆ فایل": "لینکی فایل",
  "لۆگۆ یان وێنەی بەرگ": "وێنە",
  "لۆگۆی دامەزراوە": "لۆگۆ",
  "ژمارەی پەیوەندی": "ژمارە",
  "ژمارەی تەلەفۆن": "ژمارە",
  "ماوە بە خولەک": "ماوە",
  "پلاتفۆرمی حجز": "پلاتفۆرم",
  "لینکی پەڕەی حجزکردن": "لینک",
};

export function shortMiniWebsiteLabel(label: string): string {
  return SHORT_LABELS[label] || label;
}

export function MiniWebsiteFieldLabel({
  children,
  required = false,
  className = "",
}: {
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <span className={`mini-website-requirement-label ${className}`}>
      {typeof children === "string"
        ? shortMiniWebsiteLabel(children)
        : children}
      {/* The required marker carries the page's own colour — never the
          platform's, which is why it reads a variable rather than a brand
          token. The optional hint is only an aside, so it stays muted instead
          of competing with the fields that actually have to be filled in. */}
      {required ? (
        <span
          className="ms-1 font-bold"
          style={{ color: "var(--theme-primary, #64748b)" }}
          aria-hidden="true"
        >
          *
        </span>
      ) : (
        <span className="ms-1 font-bold text-slate-400 dark:text-slate-500">
          (ئارەزوومەندانە)
        </span>
      )}
    </span>
  );
}
