"use client";

interface AuthenticationCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  plain?: boolean;
}

export function AuthenticationCard({
  title,
  description,
  children,
  plain = false,
}: AuthenticationCardProps) {
  return (
    <section
      className={`relative ${plain ? "py-2" : "rounded-[26px] border border-slate-200 bg-white/80 p-5 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_18px_55px_rgba(0,0,0,.22)] sm:p-6"}`}
    >
      <div className="mb-4 px-2 text-center" dir="rtl">
        <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
