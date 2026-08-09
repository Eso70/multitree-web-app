"use client";

import { useMemo, useState } from "react";
import { EmailCodeAuthenticationForm } from "@/components/shared/EmailCodeAuthenticationForm";
import { GoogleAuthenticationButton } from "@/components/shared/GoogleAuthenticationButton";
import { CheckboxField } from "@/components/shared/CheckboxField";

interface AuthenticationMethodsProps {
  googleHref: string;
  requestEndpoint: string;
  verifyEndpoint: string;
  rememberDevice?: boolean;
  emailPlaceholder?: string;
  emailActionLabel?: string;
  emailCodeTitle?: string;
  emailVerifyActionLabel?: string;
}

export function AuthenticationMethods({
  googleHref,
  requestEndpoint,
  verifyEndpoint,
  rememberDevice = false,
  emailPlaceholder,
  emailActionLabel,
  emailCodeTitle,
  emailVerifyActionLabel,
}: AuthenticationMethodsProps) {
  const [remember, setRemember] = useState(true);
  const googleUrl = useMemo(() => {
    if (!rememberDevice || !remember) return googleHref;
    return `${googleHref}${googleHref.includes("?") ? "&" : "?"}remember=1`;
  }, [googleHref, remember, rememberDevice]);

  return (
    <div className="space-y-5">
      <GoogleAuthenticationButton href={googleUrl} />
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          or
        </span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>
      <EmailCodeAuthenticationForm
        requestEndpoint={requestEndpoint}
        verifyEndpoint={verifyEndpoint}
        rememberDevice={remember}
        emailPlaceholder={emailPlaceholder}
        actionLabel={emailActionLabel}
        codeTitle={emailCodeTitle}
        verifyActionLabel={emailVerifyActionLabel}
      />
      {rememberDevice ? (
        <CheckboxField
          compact
          checked={remember}
          onChange={setRemember}
          label="Keep me signed in on this device"
        />
      ) : null}
    </div>
  );
}
