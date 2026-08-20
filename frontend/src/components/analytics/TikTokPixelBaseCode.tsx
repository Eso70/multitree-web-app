import { tiktokBaseCodeSnippet } from "@/features/analytics/tiktok-base-code-snippet";

interface TikTokPixelBaseCodeProps {
  pixelIds?: string[] | null;
  /** The request nonce set by the proxy; the inline script needs it for the CSP. */
  nonce?: string;
}

/**
 * Server-renders a business's pixel base code into the initial HTML.
 *
 * Rendered by the specialized Linktree and mini-website server routes
 * (`pixel-placement.spec.ts` pins both sides). Fixed routes use the shared
 * client loader. Having the
 * base code in the raw HTML is what makes TikTok's "verify Pixel setup"
 * crawler find the tag: a script injected only after React hydrates is
 * invisible to a snapshot taken before that.
 *
 * This is a server component: it renders once, into the HTML the crawler and
 * the browser both receive, and it never re-renders on soft navigation — the
 * client tracker (`TikTokPixel`) owns page views and replay of events.
 */
export function TikTokPixelBaseCode({
  pixelIds,
  nonce,
}: TikTokPixelBaseCodeProps): React.ReactElement | null {
  const snippet = tiktokBaseCodeSnippet(pixelIds ?? []);
  if (!snippet) return null;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: snippet }} />;
}
