type Section = { title: string; paragraphs: string[] };

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
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12" dir="ltr">
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1c222b] sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          MultiTree · Version {version}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
          {title}
        </h1>
        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-10 border-t border-slate-200 pt-5 text-xs leading-5 text-amber-700 dark:border-white/10 dark:text-amber-300">
          ئەم دەقە بنەمای ستانداردی بەرهەمە. پێش بەکارهێنانی بازرگانی،
          پارێزەرێکی شارەزا بە یاساکانی ناوخۆیی دەبێت پێداچوونەوەی بۆ بکات.
        </p>
      </article>
    </main>
  );
}
