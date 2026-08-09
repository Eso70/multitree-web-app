"use client";

import { useEffect, useState } from "react";
import { ErrorPage } from "@/components/error-pages/ErrorPage";
import {
  businessErrorTheme,
  MULTITREE_ERROR_THEME,
  type ErrorPageTheme,
} from "@/components/error-pages/error-theme";
import { ERROR_PAGE_COPY } from "@/components/error-pages/copy";
import {
  extractSubdomainFromHost,
  loadAuthenticatedBusinessTheme,
  loadBusinessSubdomainTheme,
} from "@/lib/utils/business-error-theme";

interface RuntimeErrorPageProps {
  context: "root" | "business";
  error: Error & { digest?: string };
  reset: () => void;
}

export function RuntimeErrorPage({
  context,
  error,
  reset,
}: RuntimeErrorPageProps) {
  const [theme, setTheme] = useState<ErrorPageTheme>(MULTITREE_ERROR_THEME);

  useEffect(() => {
    if (context === "business") {
      loadAuthenticatedBusinessTheme().then((value) =>
        setTheme(businessErrorTheme(value)),
      );
      return;
    }

    if (extractSubdomainFromHost(window.location.hostname)) {
      loadBusinessSubdomainTheme().then((value) =>
        setTheme(businessErrorTheme(value)),
      );
    }
  }, [context]);

  return (
    <ErrorPage
      {...ERROR_PAGE_COPY.unexpected}
      theme={theme}
      homeHref="/"
      onReset={reset}
      errorDigest={error.digest}
    />
  );
}
