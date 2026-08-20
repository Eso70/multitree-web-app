import { MARKETING_FAQS } from "./marketing-content";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function FaqSection() {
  return (
    <PublicSection id="faq">
        <MarketingSectionHeading
          eyebrow="پرسیار و وەڵام"
          title="ئەو شتانەی پێویستە بیزانیت"
        />
        <div className="mx-auto mt-16 max-w-4xl divide-y divide-black/10 border-y border-black/10 dark:divide-white/10 dark:border-white/10 sm:mt-20">
          {MARKETING_FAQS.map((faq, index) => (
            <details key={faq.question} className="group py-5 open:pb-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-black sm:text-lg">
                <span>{faq.question}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-black/10 text-sm transition group-open:rotate-45 dark:border-white/10">
                  +
                </span>
              </summary>
              <p className="mt-4 max-w-3xl pe-10 text-sm leading-7 text-black/50 dark:text-white/45">
                {faq.answer}
              </p>
              <span className="sr-only">پرسیاری {index + 1}</span>
            </details>
          ))}
        </div>
    </PublicSection>
  );
}
