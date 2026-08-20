import Link from "next/link";
import { HelpCircle, Mail, UserRound } from "lucide-react";
import { PublicSection } from "@/components/public/PublicSection";

export function ContactContent() {
  const cards = [
    {
      icon: UserRound,
      title: "هەژماری Creator",
      text: "بۆ دروستکردن یان چوونەژوورەوەی هەژمار",
      label: "چوونەژوورەوە",
      href: "/login",
    },
    {
      icon: HelpCircle,
      title: "پرسیارە باوەکان",
      text: "وەڵامی پرسیارە سەرەتاییەکان لە ماڵپەڕەکەدا ببینە",
      label: "View FAQ",
      href: "/#faq",
    },
    {
      icon: Mail,
      title: "پەیوەندی گشتی",
      text: "زانیاری پەیوەندی لە Platform Settings ـەوە دینامیک دەکرێت",
      label: "دەربارەی MultiTree",
      href: "/about",
    },
  ];
  return (
    <PublicSection>
      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-[2rem] border border-black/10 bg-white/55 p-7 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <card.icon className="h-6 w-6 text-[var(--multitree-accent)]" />
            <h2 className="mt-6 text-lg font-black">{card.title}</h2>
            <p className="mt-3 min-h-14 text-sm leading-7 text-black/48 dark:text-white/43">
              {card.text}
            </p>
            <Link
              href={card.href}
              className="mt-6 inline-flex text-sm font-black underline decoration-[var(--multitree-accent)] decoration-2 underline-offset-4"
            >
              {card.label}
            </Link>
          </article>
        ))}
      </div>
    </PublicSection>
  );
}
