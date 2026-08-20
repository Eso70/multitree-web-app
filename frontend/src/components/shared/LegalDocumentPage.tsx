import { PublicSiteNavbar } from "@/components/public/PublicSiteNavbar";
import { CustomScrollbar } from "@/components/home/CustomScrollbar";
import { HomeFooter } from "@/components/home/HomeFooter";
import { MARKETING_NAVIGATION } from "@/features/public-site/marketing-content";

type Section = { title: string; paragraphs: string[] };

/**
 * Shell for the published legal documents.
 *
 * Onboarding opens these in a new tab (`InvitationEntryPage`,
 * `BusinessSignupWizard`), so they are entered with no history to go back to
 * and carry the root-domain navbar and footer rather than standing alone.
 *
 * The document reads directly on the page surface instead of inside a card.
 * That surface has to be painted here: the body gradient
 * (`--theme-bg-from/via/to` in `globals.css`) has no dark override, so a page
 * that renders straight onto it puts light backgrounds behind dark-mode text.
 * `bg-white dark:bg-[#0f172a]` is the same pair the adaptive `PublicSiteFooter`
 * and the scrolled navbar glass use, so the three read as one surface.
 *
 * The document body is Kurdish and renders `dir="rtl"`; the root layout sets
 * `dir="ltr"` on `<html>`, so the direction has to be declared on the element
 * that actually wraps the prose. The brand + revision line stays LTR because
 * an RTL context reorders `MultiTree · Version 2026-08-19`.
 */
export function LegalDocumentPage({
  title,
  version,
  sections,
}: {
  title: string;
  version: string;
  sections: Section[];
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111827] dark:bg-[#0f172a] dark:text-white">
      {/* These are the only MultiTree pages long enough to scroll that did not
          carry the floating lime thumb; the landing page, the error pages, and
          the tenant public pages already mount it, and the authentication
          surfaces are `h-screen overflow-hidden` with no page scroll at all. */}
      <CustomScrollbar />
      {/* The navbar's section links are same-page anchors on the landing page.
          These documents have no such sections, so they resolve against `/`. */}
      <PublicSiteNavbar
        appearance="business"
        navigationItems={MARKETING_NAVIGATION}
        action={{ label: "هەژمار دروست بکە", href: "/signup" }}
        secondaryAction={{ label: "چوونەژوورەوە", href: "/login" }}
        emphasizeFirstNavItem={false}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-24 pt-28 sm:px-6 sm:pt-32">
        <header className="border-b border-gray-200 pb-8 dark:border-white/10">
          <p
            className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500"
            dir="ltr"
          >
            MultiTree · Version {version}
          </p>
          <h1
            className="mt-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
            dir="rtl"
          >
            {title}
          </h1>
        </header>
        <div className="mt-10 space-y-10" dir="rtl">
          {sections.map((section, sectionIndex) => (
            <section key={sectionIndex}>
              <h2 className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-slate-100">
                <span
                  aria-hidden="true"
                  className="h-5 w-1 shrink-0 rounded-full bg-[var(--multitree-accent)]"
                />
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-3 text-sm leading-8 text-gray-600 dark:text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
