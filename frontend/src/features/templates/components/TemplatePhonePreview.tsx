"use client";

import type { ReactNode } from "react";
import { LockedItemOverlay } from "@/components/shared/LockedContent";
import { useNearViewport } from "@/hooks/useNearViewport";
import { Skeleton } from "@/components/shared/Skeleton";
import { PhoneMockup } from "@/components/shared/PhoneMockup";

export function TemplatePhonePreview({
  name,
  ariaLabel,
  darkTheme = false,
  locked = false,
  scrollable = false,
  children,
}: {
  name: string;
  ariaLabel: string;
  darkTheme?: boolean;
  locked?: boolean;
  scrollable?: boolean;
  children: (isNear: boolean) => ReactNode;
}) {
  const { ref, isNear } = useNearViewport();

  return (
    <div
      ref={ref}
      className="relative mx-auto w-[260px] max-w-full sm:w-[320px]"
    >
      <PhoneMockup
        name={name}
        ariaLabel={ariaLabel}
        darkTheme={darkTheme}
        scrollable={scrollable}
        overlay={
          locked ? (
            <LockedItemOverlay
              label="ئەم قالبە لە پلانی ئێستاتدا بەردەست نییە"
              roundedClassName="rounded-[2.5rem] sm:rounded-[3rem]"
            />
          ) : null
        }
      >
        {children(isNear)}
      </PhoneMockup>
    </div>
  );
}

export function TemplatePreviewSkeleton() {
  return <Skeleton className="h-full w-full" rounded="rounded-none" />;
}
