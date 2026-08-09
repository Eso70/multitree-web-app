const SCRIPT_HOSTS = [
  "https://analytics.tiktok.com",
  "https://*.tiktok.com",
  "https://vercel.live",
  "https://*.vercel.live",
  "https://*.vercel.com",
].join(" ");

export function createContentSecurityPolicy(
  nonce: string,
  development = process.env.NODE_ENV === "development",
): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    development ? "'unsafe-eval'" : "",
    SCRIPT_HOSTS,
  ].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "media-src 'self' data: https: blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "font-src 'self' data: https://analytics.tiktok.com https://*.tiktok.com",
    "connect-src 'self' https://analytics.tiktok.com https://*.tiktok.com https://*.tiktokw.us https://*.tiktokcdn.com https://*.byteoversea.com https://*.ibyteimg.com https://*.snssdk.com https://*.muscdn.com https://ads.tiktok.com https://tiles.openfreemap.org https://*.openfreemap.org https://vercel.live https://*.vercel.live https://*.vercel.com https://*.vercel.app wss://*.vercel.live wss://*.vercel.com",
    "frame-src 'self' https://vercel.live https://*.vercel.live https://*.vercel.com https://www.google.com https://maps.google.com https://maps.app.goo.gl https://*.google.com https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com https://www.tiktok.com https://www.instagram.com https://www.facebook.com https://player.vimeo.com https://www.dailymotion.com https://streamable.com https://www.loom.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ") + ";";
}
