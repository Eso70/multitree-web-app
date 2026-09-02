"use client";

import { memo, type CSSProperties } from "react";
import type { LinktreePresentationLink } from "@linktree/types";
import { getPlatformName } from "@/components/public/LinktreeButtons";

export interface TemplateLinkLabelProps {
  link: LinktreePresentationLink;
  className?: string;
  style?: CSSProperties;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  platformClassName?: string;
  platformStyle?: CSSProperties;
}

/**
 * Shared two-line Linktree button label. The owner-editable display name is
 * the primary line; the smaller English platform name is catalog-owned and
 * cannot be changed through page content.
 */
export const TemplateLinkLabel = memo(function TemplateLinkLabel({
  link,
  className = "min-w-0 flex-1 text-left",
  style,
  titleClassName = "block truncate text-base font-semibold leading-tight",
  titleStyle,
  platformClassName = "mt-1 block truncate font-sans text-xs leading-tight opacity-70",
  platformStyle,
}: TemplateLinkLabelProps) {
  const platformName = getPlatformName(link.platform);
  const title = link.display_name?.trim() || platformName;

  return (
    <span className={className} style={style} data-template-link-label>
      <span className={titleClassName} style={titleStyle}>
        {title}
      </span>
      <span
        className={platformClassName}
        style={platformStyle}
        data-template-platform-name
      >
        {platformName}
      </span>
    </span>
  );
});
