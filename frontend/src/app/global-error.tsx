"use client";

import { RuntimeErrorPage } from "@/components/error-pages/RuntimeErrorPage";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="ckb" dir="rtl">
      <body>
        <RuntimeErrorPage context="root" error={error} reset={reset} />
      </body>
    </html>
  );
}
