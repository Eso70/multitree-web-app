"use client";

import Image from "next/image";
import { Fragment, memo, type CSSProperties, type ReactNode } from "react";

const DEFAULT_FALLBACK_DESCRIPTION = "بۆ پەیوەندی کردن, کلیک لەم لینکانەی خوارەوە بکە";
const DEFAULT_AVATAR = "/images/DefaultAvatar.png";

export const STANDARD_TEMPLATE_HEADER_CLASSES = {
  content: "flex flex-col items-center gap-4 text-center",
  avatar: "h-28 w-28",
  text: "flex flex-col items-center gap-1.5 text-center",
  name: "text-3xl font-bold leading-tight text-balance px-2",
  subtitle:
    "text-base font-medium leading-snug max-w-sm text-pretty px-2",
  description: "text-sm leading-relaxed max-w-sm text-pretty px-2",
} as const;

export const STANDARD_TEMPLATE_HEADER_AVATAR_SIZES = "112px";

function Wrap({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!className && !style) {
    return <Fragment>{children}</Fragment>;
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export interface TemplateHeaderProps {
  /** Business/linktree display name. Always rendered. */
  name: string;
  subtitle?: string | null;
  description?: string | null;
  /** Shown when `description` is empty. Defaults to the standard Kurdish CTA copy. */
  fallbackDescription?: string;
  image?: string | null;

  textColor?: string;
  textSecondaryColor?: string;
  /** Subtitle color. Defaults to the secondary text color so it remains distinct from the name. */
  subtitleColor?: string;

  /** Outer wrapper element. `header` by default; templates that already sit inside a `<header>` can use `div`. */
  as?: "header" | "div";
  className?: string;

  /** Optional wrapper grouping the avatar and text block together, e.g. for a flex column with a shared gap. Omit for templates that lay avatar/name/subtitle/description as flat siblings. */
  contentWrapperClassName?: string;
  contentWrapperStyle?: CSSProperties;

  /** Optional wrapper around the avatar only (glow + clipping circle), e.g. `relative shrink-0`. Omit when the avatar has no separate outer box. */
  avatarOuterClassName?: string;
  avatarOuterStyle?: CSSProperties;
  /** Circular avatar clipping wrapper (size, border, shadow, backdrop, padding). */
  avatarWrapperClassName?: string;
  avatarWrapperStyle?: CSSProperties;
  /** Element painted behind the avatar wrapper, e.g. a radial glow. Positioned absolutely by the caller's className. */
  avatarGlow?: ReactNode;
  /** Applied to the `<Image>` itself. */
  avatarClassName?: string;
  avatarStyle?: CSSProperties;
  /** Intrinsic pixel size for `next/image` `fill` sizing hints. */
  avatarSizes?: string;
  avatarPriority?: boolean;
  /** Skips Next.js image optimization for the avatar. Matches the previous LinktreeHeader behavior for templates that need it. */
  avatarUnoptimized?: boolean;

  /** Optional wrapper around name/subtitle/description/children, e.g. a `space-y-*` text column. Omit for flat siblings. */
  textWrapperClassName?: string;
  textWrapperStyle?: CSSProperties;

  nameClassName?: string;
  nameStyle?: CSSProperties;
  subtitleClassName?: string;
  subtitleStyle?: CSSProperties;

  /** Wraps the description text. Lets templates render it as a plain paragraph or a badge/pill. */
  descriptionWrapperClassName?: string;
  descriptionWrapperStyle?: CSSProperties;
  descriptionClassName?: string;
  descriptionStyle?: CSSProperties;

  /** Extra content rendered after the description, e.g. a template-specific indicator. */
  children?: ReactNode;
}

/**
 * Reusable profile header for public linktree templates: avatar, name,
 * optional subtitle, and description. Every visual aspect (sizes, spacing,
 * colors, avatar treatment, and optional nesting levels) is customizable via
 * className/style props so each template can reproduce its own layout, while
 * the structure, fallback image handling, and copy defaults live in one
 * place. `children` extends the header with template-specific content
 * without forking the component.
 */
export const TemplateHeader = memo(function TemplateHeader({
  name,
  subtitle,
  description,
  fallbackDescription = DEFAULT_FALLBACK_DESCRIPTION,
  image,
  textColor = "#ffffff",
  textSecondaryColor = "rgba(255, 255, 255, 0.8)",
  subtitleColor,
  as = "header",
  className = "",
  contentWrapperClassName,
  contentWrapperStyle,
  avatarOuterClassName,
  avatarOuterStyle,
  avatarWrapperClassName = "",
  avatarWrapperStyle,
  avatarGlow,
  avatarClassName = "",
  avatarStyle,
  avatarSizes = "128px",
  avatarPriority = true,
  avatarUnoptimized = false,
  textWrapperClassName,
  textWrapperStyle,
  nameClassName = "",
  nameStyle,
  subtitleClassName = "",
  subtitleStyle,
  descriptionWrapperClassName,
  descriptionWrapperStyle,
  descriptionClassName = "",
  descriptionStyle,
  children,
}: TemplateHeaderProps) {
  const imageSrc = image || DEFAULT_AVATAR;
  const trimmedSubtitle = subtitle?.trim() || "";
  const resolvedDescription = description?.trim() || fallbackDescription;
  const resolvedSubtitleColor = subtitleColor || textSecondaryColor;

  const Wrapper = as;

  const descriptionNode = (
    <p className={descriptionClassName} style={{ color: textSecondaryColor, ...descriptionStyle }}>
      {resolvedDescription}
    </p>
  );

  const avatarNode = (
    <Wrap className={avatarOuterClassName} style={avatarOuterStyle}>
      {avatarGlow}
      <div className={avatarWrapperClassName} style={avatarWrapperStyle}>
        <Image
          src={imageSrc}
          alt={name || "Profile"}
          fill
          sizes={avatarSizes}
          priority={avatarPriority}
          unoptimized={avatarUnoptimized}
          className={`object-cover ${avatarClassName}`.trim()}
          style={avatarStyle}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.endsWith(DEFAULT_AVATAR)) {
              target.src = DEFAULT_AVATAR;
            }
          }}
        />
      </div>
    </Wrap>
  );

  const textNode = (
    <Wrap className={textWrapperClassName} style={textWrapperStyle}>
      <h1 className={nameClassName} style={{ color: textColor, ...nameStyle }}>
        {name}
      </h1>

      {trimmedSubtitle ? (
        <p
          className={subtitleClassName}
          style={{ color: resolvedSubtitleColor, ...subtitleStyle }}
        >
          {trimmedSubtitle}
        </p>
      ) : null}

      {descriptionWrapperClassName ? (
        <div className={descriptionWrapperClassName} style={descriptionWrapperStyle}>
          {descriptionNode}
        </div>
      ) : (
        descriptionNode
      )}

      {children}
    </Wrap>
  );

  return (
    <Wrapper className={className} data-template-avatar-header>
      <Wrap className={contentWrapperClassName} style={contentWrapperStyle}>
        {avatarNode}
        {textNode}
      </Wrap>
    </Wrapper>
  );
});
