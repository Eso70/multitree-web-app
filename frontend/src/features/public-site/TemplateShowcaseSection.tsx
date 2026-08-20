import Link from "next/link";
import { ArrowLeft, Globe2, Link2 } from "lucide-react";
import { MOCK_TEMPLATES } from "./marketing-content";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function TemplateShowcaseSection({
  showAll = false,
}: {
  showAll?: boolean;
}) {
  const templates = showAll
    ? [...MOCK_TEMPLATES, ...MOCK_TEMPLATES]
    : MOCK_TEMPLATES;
  return (
    <PublicSection id="templates">
        <MarketingSectionHeading
          eyebrow="نموونەی کاتی"
          title="بە قاڵبێک دەست پێ بکە، بە شێوەی خۆت تەواوی بکە"
          description="ئەم نموونانە بۆ دیزاینی سەرەتایین؛ لە قۆناغی داهاتوودا ڕاستەوخۆ لە کەتەلۆگی قاڵبەکانەوە دێن"
        />
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {templates.map((template, index) => (
            <article
              key={`${template.name}-${index}`}
              className="group overflow-hidden rounded-[1.6rem] border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div
                className="relative aspect-[3/4] overflow-hidden rounded-[1.2rem]"
                style={{
                  background: `linear-gradient(145deg, ${template.tone}, color-mix(in srgb, ${template.tone} 35%, #111827))`,
                }}
              >
                <div className="absolute inset-x-5 top-7 mx-auto h-12 w-12 rounded-full bg-white/85" />
                <div className="absolute inset-x-4 top-24 space-y-2">
                  {[1, 2, 3, 4].map((item) => (
                    <span
                      key={item}
                      className="block h-8 rounded-xl bg-white/75"
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-4">
                <div>
                  <h3 className="text-sm font-black">{template.name}</h3>
                  <p className="mt-1 text-[0.65rem] text-black/40 dark:text-white/35">
                    {template.type}
                  </p>
                </div>
                {template.type === "Linktree" ? (
                  <Link2 className="h-4 w-4 text-black/30 dark:text-white/30" />
                ) : (
                  <Globe2 className="h-4 w-4 text-black/30 dark:text-white/30" />
                )}
              </div>
            </article>
          ))}
        </div>
        {!showAll ? (
          <div className="mt-8 text-center">
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-black"
            >
              بینینی هەموو قاڵبەکان
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
    </PublicSection>
  );
}
