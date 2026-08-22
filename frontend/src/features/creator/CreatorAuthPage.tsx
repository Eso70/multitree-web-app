"use client";

import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { CreatorAuthenticationPanel } from "@/features/creator/CreatorAuthenticationPanel";
import type { CreatorAuthMode } from "@/features/creator/creator-auth.types";

export function CreatorAuthPage({ mode }: { mode: CreatorAuthMode }) {
  return (
    <AuthenticationShell
      previewTitle="پانێڵی بەکارهێنەر"
      brandDescription={
        mode === "signup"
          ? "بچۆ ژوورەوە بۆ دروستکردن و بەڕێوەبردنی پەڕەکانت"
          : "بگەڕێوە بۆ بەڕێوەبردنی پەڕەکەت"
      }
    >
      <CreatorAuthenticationPanel mode={mode} />
    </AuthenticationShell>
  );
}
