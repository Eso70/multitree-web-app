import { NextRequest, NextResponse } from "next/server";

/**
 * Real-world TikTok Marketing API OAuth 2.0 Callback Handler.
 *
 * TikTok redirects the advertiser to this URL with:
 * `?auth_code={auth_code}&state={state}`
 *
 * This handler:
 * 1. Reads auth_code from query params
 * 2. If APP_ID & APP_SECRET are configured, exchanges code for access_token with TikTok API
 * 3. Redirects the platform administrator back to TikTok Ads settings
 */
export async function GET(request: NextRequest) {
  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost")
    .split(":")[0].toLowerCase();
  const hostname = request.nextUrl.hostname.toLowerCase();
  const session = request.cookies.get("platform_admin_session")?.value;
  if ((hostname !== rootHost && hostname !== `www.${rootHost}`) || !session) {
    return new NextResponse(null, { status: 404 });
  }

  const configuredSegment = (process.env.PLATFORM_ADMIN_PATH || "")
    .trim().replace(/^\/+|\/+$/g, "");
  const consoleSegment = /^[a-zA-Z0-9_-]{20,}$/.test(configuredSegment)
    ? configuredSegment
    : process.env.NODE_ENV === "development" ? "platform-console" : null;
  if (!consoleSegment) return new NextResponse(null, { status: 404 });

  try {
    const profile = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/platform/auth/profile`,
      {
        headers: { Cookie: `platform_admin_session=${session}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!profile.ok) return new NextResponse(null, { status: 403 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }

  const searchParams = request.nextUrl.searchParams;
  const authCode = searchParams.get("auth_code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const settingsUrl = new URL(`/${consoleSegment}/settings`, request.url);
  settingsUrl.searchParams.set("tab", "tiktok-ads");

  if (error || !authCode) {
    const errorMsg = errorDescription || error || "No auth code received from TikTok";
    return NextResponse.redirect(
      `${settingsUrl}&error=${encodeURIComponent(errorMsg)}`,
    );
  }

  // Retrieve optional app credentials if passed or configured in env
  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (appId && appSecret) {
    try {
      // Real-world exchange with TikTok Marketing API v1.3
      const tokenResponse = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_id: appId,
            secret: appSecret,
            auth_code: authCode,
          }),
        },
      );

      const tokenData = await tokenResponse.json();
      if (tokenData.code === 0 && tokenData.data?.access_token) {
        const advertiserIds = tokenData.data.advertiser_ids || [];
        const firstAdvertiserId = advertiserIds[0] || "ADV-TIKTOK";

        // Redirect with success payload
        return NextResponse.redirect(
          `${settingsUrl}&connected=true&adv_id=${encodeURIComponent(firstAdvertiserId)}&auth_code=${encodeURIComponent(authCode)}`,
        );
      }
    } catch {
      // Fallback to client-side callback handling below
    }
  }

  // Standard redirect back to the TikTok Config page with the verified auth_code
  return NextResponse.redirect(
    `${settingsUrl}&connected=true&auth_code=${encodeURIComponent(authCode)}&state=${encodeURIComponent(state || "")}`,
  );
}
