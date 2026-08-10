import { tiktokBaseCodeSnippet } from "@/features/analytics/tiktok-base-code-snippet";

interface TikTokPixelBaseCodeProps {
  pixelIds?: string[] | null;
  /** The request nonce set by the proxy; the inline script needs it for the CSP. */
  nonce?: string;
}

/**
 * Server-renders a business's pixel base code into the initial HTML.
 *
 * Rendered by exactly the two public server pages — the linktree route and
 * the mini-website route — because those are the only surfaces that may carry
 * a pixel (`pixel-placement.spec.ts` pins both sides of this). Having the
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