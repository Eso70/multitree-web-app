/**
 * The mini-website names for the shared background-pattern catalogue.
 *
 * The patterns themselves live in `lib/templates/background-pattern`, because
 * the linktree templates draw the same set. These aliases stay so mini-website
 * code reads the way it always did.
 */
export {
  BACKGROUND_PATTERN_OPTIONS as BACKGROUND_STYLE_OPTIONS,
  BackgroundPattern as MiniWebsiteBackgroundPattern,
  backgroundPatternLabel as backgroundStyleLabel,
} from "@/lib/templates/background-pattern";
