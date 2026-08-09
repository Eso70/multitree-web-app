"use client";

import { AuthenticationCard } from "@/components/shared/AuthenticationCard";
import { AuthenticationMethods } from "@/components/shared/AuthenticationMethods";
import { AuthenticationShell } from "@/components/shared/AuthenticationShell";

export default function PlatformAdminLoginPage() {
  return (
    <AuthenticationShell brandDescription="بە پاراستن و سادەیی پلاتفۆرمەکەت بەڕێوە ببە">
      <AuthenticationCard
        title="چوونەژوورەوەی بەڕێوەبەر"
        description="بە گوگڵ یان کۆدی یەکجارەی ئیمەیڵ بچۆ ژوورەوە"
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
