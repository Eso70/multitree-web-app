import { MARKETING_STEPS } from "./marketing-content";
import { MarketingSectionHeading } from "./MarketingSectionHeading";
import { PublicSection } from "@/components/public/PublicSection";

export function HowItWorksSection() {
  return (
    <PublicSection id="how-it-works">
        <MarketingSectionHeading
          eyebrow="سادە و خێرا"
          title="لە سێ هەنگاودا بڵاوی بکەرەوە"
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {MARKETING_STEPS.map((step) => (
            <article
              key={step.number}
              className="rounded-[1.75rem] border border-black/10 bg-[#f8f9fa] p-7 dark:border-white/10 dark:bg-[#0b0d0e]"
            >
              <span className="text-4xl font-black text-[var(--multitree-accent)]">
                {step.number}
              </span>
              <h3 className="mt-7 text-lg font-black">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-black/48 dark:text-white/43">
                {step.description}
              </p>
            </article>
          ))}
        </div>
    </PublicSection>
  );
}
