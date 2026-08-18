import type { ComponentType } from "react";
import type {
  BackgroundPatternStyle,
  LinktreePresentation as Linktree,
  LinktreePresentationLink as Link,
} from "@linktree/types";

export interface TemplateTheme {
  from: string;
  via: string;
  to: string;
  isSolid?: boolean;
  /**
   * A validated uploaded background image. When set it replaces the template's
   * gradient; the colours stay so text and accents keep deriving from them.
   */
  backgroundImage?: string | null;
  /**
   * A repeating pattern drawn over the surface, whatever that surface is —
   * gradient, solid colour or uploaded image. Drawn by
   * `TemplateViewportLayout`, so every template inherits it.
   */
  backgroundPattern?: BackgroundPatternStyle | null;
  // Derived accent colors for UI elements
  accent?: string; // Main accent color (for highlights, status indicators)
  border?: string; // Border color with opacity
  text?: string; // Primary text color
  textSecondary?: string; // Secondary/muted text color
  highlight?: string; // Bright highlight color (for status dots, etc.)
}

export interface TemplateComponentProps {
  linktree: Linktree;
  links: Link[];
  theme: TemplateTheme;
  onLinkClick: (linkId: string, url: string, platform: string, defaultMessage?: string | null) => void;
}

export type TemplateComponent = ComponentType<TemplateComponentProps>;
