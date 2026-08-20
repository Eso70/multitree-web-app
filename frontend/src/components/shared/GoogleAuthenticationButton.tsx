import Image from "next/image";

interface GoogleAuthenticationButtonProps {
  href: string;
  label?: string;
}

export function GoogleAuthenticationButton({
  href,
  label = "Continue with Google",
}: GoogleAuthenticationButtonProps) {
  return (
    <a
      href={href}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-white/15 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
    >
      <Image
        src="/images/icons8-google-logo.svg"
        alt=""
        width={20}
        height={20}
        aria-hidden="true"
      />
      {label}
    </a>
  );
}
