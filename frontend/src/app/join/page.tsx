import { Suspense } from "react";
import { InvitationEntryPage } from "@/features/onboarding/components/InvitationEntryPage";
import { SkeletonAuthenticationPage } from "@/components/shared/SkeletonAuthenticationPage";

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <SkeletonAuthenticationPage brandDescription="هەژماری بزنسەکەت دروست بکە" />
      }
    >
      <InvitationEntryPage />
    </Suspense>
  );
}
