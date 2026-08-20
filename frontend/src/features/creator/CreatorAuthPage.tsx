"use client";

import { AuthenticationShell } from "@/components/shared/AuthenticationShell";
import { CreatorAuthenticationPanel } from "@/features/creator/CreatorAuthenticationPanel";
import type { CreatorAuthMode } from "@/features/creator/creator-auth.types";

export function CreatorAuthPage({ mode }: { mode: CreatorAuthMode }) {
  return (
    <AuthenticationShell
      previewTitle="پانێڵی Creator"
      brandDescription={
        mode === "signup"
          ? "ناسنامەی دیجیتاڵیت بە پاراستن دروست بکە"
          : "بگەڕێوە بۆ بەڕێوەبردنی پەڕەکەت"
      }
    >
      <CreatorAuthenticationPanel mode={mode} />
    </AuthenticationShell>
  );
}
