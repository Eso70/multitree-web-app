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
  scrollable = true,
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
    // A flex row rather than a shrink-to-fit box: the frame's own width is a
    // percentage on phones, and a percentage inside `w-fit` resolves against a
    // width that does not exist yet, collapsing the mockup to nothing.
    <div ref={ref} className="relative flex w-full justify-center">
      <PhoneMockup
        size="responsive"
        name={name}
        ariaLabel={ariaLabel}
        darkTheme={darkTheme}
        scrollable={scrollable}
        // The nested viewport is only built once the card is near the screen,
        // so a catalog of frames costs one document, not five.
        active={isNear}
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
