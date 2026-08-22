"use client";

import { RuntimeErrorPage } from "@/components/error-pages/RuntimeErrorPage";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return <RuntimeErrorPage context="platform" error={error} reset={reset} />;
}
