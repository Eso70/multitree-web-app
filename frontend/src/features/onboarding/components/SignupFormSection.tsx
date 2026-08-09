interface SignupFormSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SignupFormSection({
  title,
  description,
  children,
}: SignupFormSectionProps) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 dark:border-white/10">
      <div dir="rtl">
        <h3 className="font-black text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
