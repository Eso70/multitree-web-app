import { Suspense } from "react";
import { InvitationEntryPage } from "@/features/onboarding/components/InvitationEntryPage";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <InvitationEntryPage />
    </Suspense>
  );
}
