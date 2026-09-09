"use client";

import type { ComponentProps } from "react";
import { ManagementModal } from "@/components/shared/ManagementModal";
import { useTheme } from "@/lib/contexts/ThemeProvider";

type Props = Omit<
  ComponentProps<typeof ManagementModal>,
  "createBusinessStyle" | "sponsorKrdTheme" | "accentColor"
>;

/** Linktree-editor modal shell locked to the active business tenant colour. */
export function ClientInvitationModal(props: Props) {
  const { color } = useTheme();
  return (
    <ManagementModal
      {...props}
      createBusinessStyle
      sponsorKrdTheme={false}
      accentColor={color.primary}
    />
  );
}
