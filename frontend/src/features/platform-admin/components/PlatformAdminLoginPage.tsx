"use client";

import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationMethods } from "@/components/shared/AuthenticationMethods";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";

export default function PlatformAdminLoginPage() {
  return (
    <AuthenticationShell brandDescription="بڕۆ ژوورەوە بۆ بەڕێوەبردنی پلاتفۆڕم">
      <AuthenticationCard
        title="چوونەژوورەوەی بەڕێوەبەر"
        description="بە گوگڵ یان ئیمێڵ بڕۆ ژوورەوە"
      >
        <AuthenticationMethods
          rememberDevice
          googleHref="/api/platform/auth/google/start"
          requestEndpoint="/api/platform/auth/email/request"
          verifyEndpoint="/api/platform/auth/email/verify"
          emailPlaceholder="Enter the administrator email"
        />
      </AuthenticationCard>
    </AuthenticationShell>
  );
}
