import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import type {
  AnalyticsEventName,
  TrackAnalyticsEventDto,
} from './dto/analytics-event.dto';
import { TIKTOK_OWNER_ELIGIBLE_SQL } from './tiktok-owner-eligibility';

export interface AnalyticsRequestContext {
  ip: string;
  userAgent: string;
  referrer?: string;
  ttp?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

interface PublicPageRow {
  id: string;
  business_id: string;
  page_type: 'linktree' | 'mini_website' | 'advertising' | 'route';
  timezone: string;
  name: string;
  slug: string;
}

/**
 * Approved public-page identities whose events may be forwarded to TikTok.
 * Route identities are created only for the explicit marketing allowlist.
 */
const TIKTOK_FORWARDED_PAGE_TYPES: ReadonlySet<PublicPageRow['page_type']> =
  new Set(['linktree', 'mini_website', 'advertising', 'route']);

/**
 * Internal events that describe engagement rather than a conversion.
 *
 * `createPageTracker.trackEngagement` reports these with no registered action,
 * which is what stops the browser firing a pixel for them. The server half had
 * no matching rule, so it forwarded them anyway under a derived name — a
 * server-only stream with no browser event to deduplicate against. A visitor
 * who opened a section and left was reaching TikTok as a `ClickButton`
 * conversion, and `form_view` was arriving as a second `ViewContent` on top of
 * the page's own. Both inflate the numbers the ad algorithm optimises on, which
 * is the outcome docs/tracking.md exists to prevent.
 *
 * Only applied when the event resolved to no registered action. The same name
 * reported against a registered action still forwards, because there the
 * browser fired the pixel and the pair has to stay complete.
 *
 * Deliberately limited to the names `trackEngagement` actually reports. `share`
 * is not among them: it is also what `mini:vcard` infers, and a contact
 * download is a conversion, so adding it here would silently stop forwarding a
 * real one.
 */
const ENGAGEMENT_ONLY_EVENTS: ReadonlySet<AnalyticsEventName> = new Set([
  'engaged_view',
  'action_open',
  'form_view',
]);

/**
 * Whether an ingested event may become a `marketing_event_outbox` row.
 *
 * Both halves of the rule live here so there is one answer to "does this reach
 * TikTok?" rather than a condition inlined in `ingest` that the tests cannot
 * reach.
 */
export function forwardsToTikTok(input: {
  pageType: PublicPageRow['page_type'];
  eventName: AnalyticsEventName;
  /** Whether the event resolved to a registered `public_page_actions` row. */
  hasAction: boolean;
}): boolean {
  if (!TIKTOK_FORWARDED_PAGE_TYPES.has(input.pageType)) return false;
  if (!input.hasAction && ENGAGEMENT_ONLY_EVENTS.has(input.eventName))
    return false;
  return true;
}

interface ActionRow {
  id: string;
  label: string;
  action_type: string;
  tiktok_event: string;
  metadata?: Record<string, unknown> | null;
}

interface RedirectActionRow {
  destination: string;
}

export const CLICK_EVENTS = new Set<AnalyticsEventName>([
  'button_click',
  'whatsapp_click',
  'call_click',
  'email_click',
  'social_click',
  'product_click',
  'service_click',
  'form_submit',
  'booking_started',
  'checkout_started',
  'order_completed',
  'download',
  'share',
]);

/**
 * The events that count as a conversion in a business's own reporting.
 *
 * Handing over contact details (`lead_created`) and paying (`order_completed`)
 * are the unambiguous ones. The three contact taps are here because a linktree
 * is overwhelmingly an ad landing page: the visitor arrives from a TikTok CTA
 * and the campaign's whole goal is the WhatsApp, call or email tap. With only
 * the first two, a linktree could never record a conversion at all — no
 * linktree event emits either — so the conversion count and conversion-rate
 * card sat at zero no matter how well a campaign performed.
 *
 * This is the *internal* vocabulary only. It does not touch what TikTok is
 * told: `tiktokEvent` maps by event name and a contact tap already resolves to
 * its action row's `Contact`, so the deduplication contract is unchanged.
 *
 * Applies to events ingested from here on. Rows already rolled up keep the
 * numbers they were written with, so a range spanning this change is not
 * comparable to one before it.
 */
export const CONVERSION_EVENTS = new Set<AnalyticsEventName>([
  'lead_created',
  'order_completed',
  'whatsapp_click',
  'call_click',
  'email_click',
]);

export const ENGAGEMENT_EVENTS = new Set<AnalyticsEventName>([
  ...CLICK_EVENTS,
  'engaged_view',
  // Reading a section or reaching the form is engagement, not a click: it says
  // the visitor got there, which is what a long page needs measured.
  'action_open',
  'form_view',
]);

export type AnalyticsChannel =
  | 'tiktok_paid'
  | 'tiktok_organic'
  | 'instagram'
  | 'facebook'
  | 'snapchat'
  | 'youtube'
  | 'search'
  | 'direct'
  | 'referral'
  | 'email'
  | 'sms'
  | 'qr'
  | 'other';

const SEARCH_ENGINE_HOSTS = /google\.|bing\.|yahoo\.|duckduckgo\./i;

const ANALYTICS_BOT_USER_AGENT =
  /googlebot|bingbot|yandexbot|duckduckbot|applebot|baiduspider|bytespider|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|embedly|quora link preview|(?:^|[^a-z])bot(?:[^a-z]|$)|crawler|spider|headlesschrome|phantomjs|puppeteer|playwright|python-requests|scrapy|curl\/|wget\//i;

export function isAnalyticsBotUserAgent(userAgent: string): boolean {
  return ANALYTICS_BOT_USER_AGENT.test(userAgent);
}

/**
 * Event properties that identify a person rather than describe a click.
 *
 * Analytics events are not a contact database. Strip identity fields so
 * callers cannot place plaintext personal data in the event-properties JSON.
 */
const CONTACT_IDENTITY_KEYS = new Set(['name', 'email', 'phone']);

@Injectable()
export class UnifiedAnalyticsService {
  private readonly hashSecret: string;

  constructor(
    private readonly database: DatabaseService,
    config: ConfigService,
  ) {
    this.hashSecret =
      config.get<string>('ANALYTICS_HASH_SECRET') ||
      config.get<string>('APP_ENCRYPTION_KEY') ||
      config.get<string>('SESSION_SECRET') ||
      '';
    if (this.hashSecret.length < 32) {
      throw new Error(
        'ANALYTICS_HASH_SECRET, APP_ENCRYPTION_KEY, or SESSION_SECRET must be at least 32 characters',
      );
    }
  }

  private hmac(value: string): string {
    return createHmac('sha256', this.hashSecret).update(value).digest('hex');
  }

  /**
   * Identity for TikTok's advanced matching: normalized, then SHA-256.
   *
   * Plain SHA-256 with no secret, because TikTok has to arrive at the same
   * digest from its own copy of the address — the keyed `hmac` above is for
   * de-duplicating our own rows and would never match theirs. Normalizing
   * first is what makes the two digests agree: `A@B.com ` and `a@b.com` are
   * one person, and unnormalized input silently halves the match rate.
   */
  private hashIdentity(
    value: string | undefined,
    kind: 'email' | 'phone' | 'id',
  ) {
    const raw = (value || '').trim();
    if (!raw) return undefined;
    const normalized =
      kind === 'email'
        ? raw.toLowerCase()
        : kind === 'phone'
          ? // E.164: digits with a leading +, which is the only form TikTok
            // documents for the pre-hash value.
            `+${raw.replace(/[^\d]/g, '')}`
          : raw.toLowerCase();
    if (kind === 'phone' && normalized.length < 8) return undefined;
    return createHash('sha256').update(normalized).digest('hex');
  }

  private normalizeOccurredAt(value: string): string {
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      throw new BadRequestException('Invalid analytics event time');
    }
    const now = Date.now();
    const minimum = now - 7 * 24 * 60 * 60 * 1000;
    const maximum = now + 5 * 60 * 1000;
    if (parsed.getTime() < minimum || parsed.getTime() > maximum) {
      throw new BadRequestException(
        'Analytics event time is outside the accepted window',
      );
    }
    return parsed.toISOString();
  }

  private device(userAgent: string): {
    deviceType: string;
    browser: string;
    operatingSystem: string;
  } {
    const ua = userAgent.toLowerCase();
    const deviceType = /ipad|tablet/.test(ua)
      ? 'tablet'
      : /mobile|android|iphone/.test(ua)
        ? 'mobile'
        : 'desktop';
    const browser = ua.includes('edg/')
      ? 'Edge'
      : ua.includes('firefox/')
        ? 'Firefox'
        : ua.includes('chrome/')
          ? 'Chrome'
          : ua.includes('safari/')
            ? 'Safari'
            : 'Other';
    const operatingSystem = ua.includes('windows')
      ? 'Windows'
      : ua.includes('android')
        ? 'Android'
        : /iphone|ipad/.test(ua)
          ? 'iOS'
          : ua.includes('mac os')
            ? 'macOS'
            : ua.includes('linux')
              ? 'Linux'
              : 'Other';
    return { deviceType, browser, operatingSystem };
  }

  private isBot(userAgent: string): boolean {
    return isAnalyticsBotUserAgent(userAgent);
  }

  private attribution(
    pageUrl?: string,
    referrer?: string,
  ): Record<string, string | undefined> {
    let url: URL | null = null;
    try {
      url = pageUrl ? new URL(pageUrl) : null;
    } catch {
      url = null;
    }
    let referrerHost: string | undefined;
    try {
      referrerHost = referrer ? new URL(referrer).hostname : undefined;
    } catch {
      referrerHost = undefined;
    }
    return {
      referrerHost,
      utmSource: url?.searchParams.get('utm_source') || undefined,
      utmMedium: url?.searchParams.get('utm_medium') || undefined,
      utmCampaign: url?.searchParams.get('utm_campaign') || undefined,
      utmContent: url?.searchParams.get('utm_content') || undefined,
      utmTerm: url?.searchParams.get('utm_term') || undefined,
      ttclid: url?.searchParams.get('ttclid') || undefined,
    };
  }

  private deriveChannel(input: {
    ttclid?: string;
    utmSource?: string;
    utmMedium?: string;
    referrerHost?: string;
  }): AnalyticsChannel {
    const source = input.utmSource?.toLowerCase() || '';
    const medium = input.utmMedium?.toLowerCase() || '';
    const host = input.referrerHost?.toLowerCase() || '';
    const paidMedium = /cpc|ppc|paid|ads/.test(medium);

    if (input.ttclid || (source.includes('tiktok') && paidMedium)) {
      return 'tiktok_paid';
    }
    if (medium === 'email') return 'email';
    if (medium === 'sms') return 'sms';
    if (medium === 'qr' || source === 'qr') return 'qr';
    if (host.includes('tiktok.com')) return 'tiktok_organic';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.com'))
      return 'facebook';
    if (host.includes('snapchat.com')) return 'snapchat';
    if (host.includes('youtube.com') || host.includes('youtu.be'))
      return 'youtube';
    if (SEARCH_ENGINE_HOSTS.test(host)) return 'search';
    if (!host && !source && !medium) return 'direct';
    if (host) return 'referral';
    return 'other';
  }

  private async resolvePage(
    client: PoolClient,
    sourceOrPublicPageId: string,
  ): Promise<PublicPageRow> {
    const result = await client.query<PublicPageRow>(
      `SELECT id, business_id, page_type, timezone, name, slug
       FROM public_pages
       WHERE deleted_at IS NULL
         AND status = 'published'
         AND (
           id = $1::uuid
           OR source_linktree_id = $1::uuid
           OR source_mini_website_id = $1::uuid
         )
       LIMIT 1`,
      [sourceOrPublicPageId],
    );
    if (!result.rows[0]) {
      throw new NotFoundException('Published public page not found');
    }
    return result.rows[0];
  }

  private async resolveAction(
    client: PoolClient,
    pageId: string,
    sourceOrActionId?: string,
  ): Promise<ActionRow | null> {
    if (!sourceOrActionId) return null;
    const result = await client.query<ActionRow>(
      `SELECT id, label, action_type, tiktok_event, metadata
       FROM public_page_actions
       WHERE public_page_id = $1
         AND (id = $2::uuid OR source_link_id = $2::uuid)
       LIMIT 1`,
      [pageId, sourceOrActionId],
    );
    // An already-rendered page may click an action after an editor archives or
    // replaces it. Resolve archived rows on the same page so the real click
    // still reaches page totals. Unknown or cross-page ids remain detached
    // from action rollups instead of rejecting the whole event.
    return result.rows[0] || null;
  }

  /**
   * Resolves an outbound navigation from the canonical registered action.
   *
   * The destination is never accepted from the browser. That makes the
   * tracking handoff safe to expose publicly without creating an arbitrary
   * open redirect. Only HTTP(S) destinations use this endpoint; native app
   * schemes use the browser's immediate beacon path instead because several
   * mobile browsers refuse an HTTP redirect into `tel:` or a custom scheme.
   */
  async resolveRedirectDestination(
    pageId: string,
    actionId: string,
    message?: string,
  ): Promise<string> {
    const result = await this.database.query<RedirectActionRow>(
      `SELECT action.destination
       FROM public_page_actions action
       JOIN public_pages page ON page.id = action.public_page_id
       WHERE (
           page.id = $1::uuid
           OR page.source_linktree_id = $1::uuid
           OR page.source_mini_website_id = $1::uuid
         )
         AND action.id = $2::uuid
         AND page.deleted_at IS NULL
         AND page.status = 'published'
         AND action.destination IS NOT NULL
       LIMIT 1`,
      [pageId, actionId],
    );
    const destination = result.rows[0]?.destination?.trim();
    if (!destination) {
      throw new NotFoundException('Tracked destination not found');
    }
    let parsed: URL;
    try {
      parsed = new URL(destination);
    } catch {
      throw new NotFoundException('Tracked destination not found');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new NotFoundException('Tracked destination not found');
    }
    // Public Linktrees keep default/preset messages separately from the link
    // destination and append them only when clicked. Preserve that behavior
    // without accepting a caller-controlled host or path: the browser may
    // supply text, but only the parameter appropriate for an already-stored
    // WhatsApp or Telegram destination can change.
    const hostname = parsed.hostname.toLowerCase();
    if (message) {
      if (
        hostname === 'wa.me' ||
        hostname === 'whatsapp.com' ||
        hostname.endsWith('.whatsapp.com')
      ) {
        parsed.searchParams.set('text', message);
      } else if (
        hostname === 't.me' ||
        hostname === 'telegram.me' ||
        hostname.endsWith('.telegram.me')
      ) {
        parsed.searchParams.set('start', message);
      }
    }
    return parsed.href;
  }

  private tiktokEvent(
    eventName: AnalyticsEventName,
    action: ActionRow | null,
  ): string {
    if (eventName === 'page_view') return 'ViewContent';
    if (eventName === 'form_submit' || eventName === 'lead_created')
      return 'Lead';
    if (eventName === 'checkout_started') return 'InitiateCheckout';
    if (eventName === 'order_completed') return 'CompletePayment';
    if (eventName === 'download') return 'Download';
    if (eventName === 'form_view') return 'ViewContent';
    // An opened section or a share is real engagement but not a conversion, so
    // it reports as a plain button click rather than inventing a funnel step.
    if (eventName === 'action_open' || eventName === 'share')
      return 'ClickButton';
    return action?.tiktok_event || 'ClickButton';
  }

  async ingest(
    input: TrackAnalyticsEventDto,
    context: AnalyticsRequestContext,
  ): Promise<{ accepted: boolean; deduplicated: boolean; eventId: string }> {
    const occurredAt = this.normalizeOccurredAt(input.occurredAt);
    const visitorHmac = this.hmac(input.visitorId.trim());
    const sessionHmac = this.hmac(input.sessionId.trim());
    const ipHmac = this.hmac(context.ip);
    const userAgent = context.userAgent.slice(0, 2000);
    const device = this.device(userAgent);
    const bot = this.isBot(userAgent);
    const attribution = this.attribution(
      input.pageUrl,
      input.referrer || context.referrer,
    );
    const channel = this.deriveChannel({
      ttclid: input.ttclid || attribution.ttclid,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      referrerHost: attribution.referrerHost,
    });
    const consent = input.consentState || 'unknown';
    const properties = input.properties || {};
    if (Buffer.byteLength(JSON.stringify(properties), 'utf8') > 8192) {
      throw new BadRequestException(
        'Analytics event properties must be 8 KB or smaller',
      );
    }
    // Identity data does not belong in the analytics event table.
    const propertiesJson = JSON.stringify(
      Object.fromEntries(
        Object.entries(properties).filter(
          ([key]) => !CONTACT_IDENTITY_KEYS.has(key),
        ),
      ),
    );

    return this.database.transaction(async (client) => {
      const page = await this.resolvePage(client, input.pageId);
      const action = await this.resolveAction(client, page.id, input.actionId);

      const visitorResult = await client.query<{ id: string }>(
        `INSERT INTO analytics_visitors (
           business_id, visitor_key_hmac, first_public_page_id, first_seen_at,
           last_seen_at, consent_state, first_attribution
         ) VALUES ($1, $2, $3, $4, $4, $5, $6::jsonb)
         ON CONFLICT (business_id, visitor_key_hmac) DO UPDATE SET
           last_seen_at = GREATEST(analytics_visitors.last_seen_at, EXCLUDED.last_seen_at),
           consent_state = CASE
             WHEN EXCLUDED.consent_state = 'unknown' THEN analytics_visitors.consent_state
             ELSE EXCLUDED.consent_state
           END
         RETURNING id`,
        [
          page.business_id,
          visitorHmac,
          page.id,
          occurredAt,
          consent,
          JSON.stringify(attribution),
        ],
      );
      const visitorId = visitorResult.rows[0].id;

      const sessionResult = await client.query<{
        id: string;
        ttclid: string | null;
        ttp: string | null;
      }>(
        `INSERT INTO analytics_sessions (
           business_id, visitor_id, session_key_hmac, landing_public_page_id,
           started_at, last_activity_at, landing_url, referrer, referrer_host,
           utm_source, utm_medium, utm_campaign, utm_content, utm_term,
           ttclid, ttp, device_type, browser, operating_system,
           country_code, region, city, is_bot, channel
         ) VALUES (
           $1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
           $19,$20,$21,$22,$23
         )
         ON CONFLICT (business_id, session_key_hmac) DO UPDATE SET
           last_activity_at = GREATEST(analytics_sessions.last_activity_at, EXCLUDED.last_activity_at),
           ttclid = COALESCE(analytics_sessions.ttclid, EXCLUDED.ttclid),
           ttp = COALESCE(analytics_sessions.ttp, EXCLUDED.ttp),
           channel = COALESCE(analytics_sessions.channel, EXCLUDED.channel),
           engagement_seconds = GREATEST(
             analytics_sessions.engagement_seconds,
             EXTRACT(EPOCH FROM (EXCLUDED.last_activity_at - analytics_sessions.started_at))::int
           ),
           updated_at = now()
         RETURNING id, ttclid, ttp`,
        [
          page.business_id,
          visitorId,
          sessionHmac,
          page.id,
          occurredAt,
          input.pageUrl || null,
          input.referrer || context.referrer || null,
          attribution.referrerHost || null,
          attribution.utmSource || null,
          attribution.utmMedium || null,
          attribution.utmCampaign || null,
          attribution.utmContent || null,
          attribution.utmTerm || null,
          input.ttclid || attribution.ttclid || null,
          input.ttp || context.ttp || null,
          device.deviceType,
          device.browser,
          device.operatingSystem,
          context.countryCode || null,
          context.region || null,
          context.city || null,
          bot,
          channel,
        ],
      );
      const sessionId = sessionResult.rows[0].id;
      /**
       * The click id and cookie for this visit, whether or not *this* event
       * carried them.
       *
       * `ttclid` arrives once, as a query parameter on the ad click that
       * started the session, and the URL loses it on the first soft
       * navigation. The event that matters — the conversion two taps later —
       * therefore has none of its own. The session row keeps the first value
       * it ever saw (`COALESCE` in the upsert above), and reading it back here
       * is what stops attribution being dropped exactly when it is worth the
       * most.
       */
      const sessionTtclid = sessionResult.rows[0].ttclid || undefined;
      const sessionTtp = sessionResult.rows[0].ttp || undefined;
      const isConversion = CONVERSION_EVENTS.has(input.eventName);

      const eventResult = await client.query<{ id: string }>(
        `INSERT INTO analytics_events (
           event_id, business_id, public_page_id, public_page_action_id,
           visitor_id, session_id, event_name, source, occurred_at, page_url,
           referrer, ip_address, ip_hmac, user_agent, device_type, browser,
           operating_system, country_code, region, city, utm_source, utm_medium,
           utm_campaign, utm_content, utm_term, ttclid, ttp, is_conversion,
           conversion_value, currency, is_bot, consent_state,
           action_label_snapshot, action_type_snapshot, properties, channel
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,'browser',$8,$9,$10,$11::inet,$12,$13,$14,$15,
           $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,
           $32,$33,$34::jsonb,$35
         )
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id`,
        [
          input.eventId,
          page.business_id,
          page.id,
          action?.id || null,
          visitorId,
          sessionId,
          input.eventName,
          occurredAt,
          input.pageUrl || null,
          input.referrer || context.referrer || null,
          context.ip,
          ipHmac,
          userAgent,
          device.deviceType,
          device.browser,
          device.operatingSystem,
          context.countryCode || null,
          context.region || null,
          context.city || null,
          attribution.utmSource || null,
          attribution.utmMedium || null,
          attribution.utmCampaign || null,
          attribution.utmContent || null,
          attribution.utmTerm || null,
          input.ttclid || attribution.ttclid || null,
          input.ttp || context.ttp || null,
          isConversion,
          isConversion ? input.conversionValue || 0 : null,
          isConversion ? input.currency || 'USD' : null,
          bot,
          consent,
          action?.label || null,
          action?.action_type || null,
          propertiesJson,
          channel,
        ],
      );

      if (!eventResult.rows[0]) {
        return {
          accepted: true,
          deduplicated: true,
          eventId: input.eventId,
        };
      }
      const databaseEventId = eventResult.rows[0].id;

      await client.query(
        `UPDATE analytics_sessions
         SET event_count = event_count + 1,
             last_activity_at = GREATEST(last_activity_at, $2::timestamptz)
         WHERE id = $1`,
        [sessionId, occurredAt],
      );

      if (!bot) {
        await this.updateRollups(client, {
          page,
          action,
          eventName: input.eventName,
          occurredAt,
          conversionValue: isConversion ? input.conversionValue || 0 : 0,
        });
      }

      if (
        !bot &&
        forwardsToTikTok({
          pageType: page.page_type,
          eventName: input.eventName,
          hasAction: Boolean(action),
        })
      ) {
        // Deduplication needs the event *name* to agree as well as the id.
        // When the browser already fired this event it tells us which name it
        // used, and that name wins: our own mapping can legitimately reach a
        // different one — a service click is `Contact` in the page and
        // `ClickButton` here — and TikTok would then count the pair twice
        // instead of collapsing it.
        const tikTokName =
          (input.browserDispatched && input.browserEventName) ||
          this.tiktokEvent(input.eventName, action);
        const identity = properties;
        const rawPlatform =
          action?.metadata &&
          typeof action.metadata === 'object' &&
          typeof action.metadata.platform === 'string'
            ? action.metadata.platform
            : typeof properties.platform === 'string'
              ? properties.platform
              : undefined;
        const contentName = rawPlatform
          ? this.canonicalPlatformName(rawPlatform)
          : action?.label || page.name;

        const payload = {
          event: tikTokName,
          event_time: Math.floor(new Date(occurredAt).getTime() / 1000),
          event_id: input.eventId,
          url: input.pageUrl,
          referrer: input.referrer || context.referrer,
          content_id: action?.id || page.id,
          content_ids: [action?.id || page.id],
          content_type: action ? action.action_type : page.page_type,
          content_name: contentName,
          value: isConversion ? input.conversionValue || 0 : undefined,
          currency: isConversion ? input.currency || 'USD' : undefined,
          ip: context.ip,
          user_agent: userAgent,
          ttclid: input.ttclid || attribution.ttclid || sessionTtclid,
          ttp: input.ttp || context.ttp || sessionTtp,
          // Advanced matching. Hashed here rather than in the processor so a
          // readable address is never written to the outbox, which is a plain
          // table a support query could select from.
          email: this.hashIdentity(
            typeof identity.email === 'string' ? identity.email : undefined,
            'email',
          ),
          phone: this.hashIdentity(
            typeof identity.phone === 'string' ? identity.phone : undefined,
            'phone',
          ),
          // The visitor row's id: stable for this person on this business, and
          // never their address, so it raises match quality without widening
          // what we hold.
          external_id: this.hashIdentity(visitorId, 'id'),
        };
        await client.query(
          `INSERT INTO marketing_event_outbox (
             analytics_event_id, business_id, destination_id, event_name,
             external_event_id, payload, browser_dispatched
           )
           SELECT $1, $2, pixel.id, $3, $4, $5::jsonb, $6
           FROM business_tiktok_pixels pixel
           JOIN businesses business ON business.id = pixel.business_id
           WHERE pixel.business_id = $2
             AND pixel.status = 'active'
             AND pixel.encrypted_events_token IS NOT NULL
             -- Same live entitlement check the public read applies before it
             -- injects the pixel. Without it a downgraded business keeps
             -- sending server events for a pixel its pages no longer load,
             -- which is a server-only stream with nothing to deduplicate
             -- against.
             AND ${TIKTOK_OWNER_ELIGIBLE_SQL}
           ON CONFLICT (analytics_event_id, destination_id) DO NOTHING`,
          [
            databaseEventId,
            page.business_id,
            tikTokName,
            input.eventId,
            JSON.stringify(payload),
            input.browserDispatched || false,
          ],
        );
      }

      return {
        accepted: true,
        deduplicated: false,
        eventId: input.eventId,
      };
    });
  }

  private async updateRollups(
    client: PoolClient,
    input: {
      page: PublicPageRow;
      action: ActionRow | null;
      eventName: AnalyticsEventName;
      occurredAt: string;
      conversionValue: number;
    },
  ): Promise<void> {
    const isView = input.eventName === 'page_view';
    const isClick = CLICK_EVENTS.has(input.eventName);
    const isConversion = CONVERSION_EVENTS.has(input.eventName);
    await client.query(
      `INSERT INTO analytics_page_daily (
         business_id, public_page_id, day, timezone, total_views,
         total_clicks, conversions, conversion_value
       ) VALUES (
         $1, $2, ($3::timestamptz AT TIME ZONE $4)::date, $4,
         $5, $6, $7, $8
       )
       ON CONFLICT (public_page_id, day, timezone) DO UPDATE SET
         total_views = analytics_page_daily.total_views + EXCLUDED.total_views,
         total_clicks = analytics_page_daily.total_clicks + EXCLUDED.total_clicks,
         conversions = analytics_page_daily.conversions + EXCLUDED.conversions,
         conversion_value = analytics_page_daily.conversion_value + EXCLUDED.conversion_value,
         updated_at = now()`,
      [
        input.page.business_id,
        input.page.id,
        input.occurredAt,
        input.page.timezone,
        isView ? 1 : 0,
        isClick ? 1 : 0,
        isConversion ? 1 : 0,
        input.conversionValue,
      ],
    );

    if (input.action && isClick) {
      await client.query(
        `INSERT INTO analytics_action_daily (
         business_id, public_page_id, public_page_action_id, day, timezone,
           total_clicks, conversions, conversion_value
         ) VALUES (
           $1,$2,$3,($4::timestamptz AT TIME ZONE $5)::date,$5,$6,$7,$8
         )
         ON CONFLICT (public_page_action_id, day, timezone) DO UPDATE SET
           total_clicks = analytics_action_daily.total_clicks + EXCLUDED.total_clicks,
           conversions = analytics_action_daily.conversions + EXCLUDED.conversions,
           conversion_value = analytics_action_daily.conversion_value + EXCLUDED.conversion_value,
           updated_at = now()`,
        [
          input.page.business_id,
          input.page.id,
          input.action.id,
          input.occurredAt,
          input.page.timezone,
          1,
          isConversion ? 1 : 0,
          input.conversionValue,
        ],
      );
    }
  }

  async getSummary(
    businessId: string,
    filters: {
      pageId?: string;
      pageType?: 'linktree' | 'mini_website';
      from?: string;
      to?: string;
    } = {},
  ) {
    const values: unknown[] = [businessId];
    const where = ['daily.business_id = $1'];
    if (filters.pageId) {
      values.push(filters.pageId);
      where.push(
        `(page.id = $${values.length}::uuid OR page.source_linktree_id = $${values.length}::uuid OR page.source_mini_website_id = $${values.length}::uuid)`,
      );
    }
    if (filters.pageType) {
      values.push(filters.pageType);
      where.push(`page.page_type = $${values.length}`);
    }
    if (filters.from) {
      values.push(filters.from);
      where.push(`daily.day >= $${values.length}::date`);
    }
    if (filters.to) {
      values.push(filters.to);
      where.push(`daily.day <= $${values.length}::date`);
    }
    const result = await this.database.query<{
      total_views: string;
      total_clicks: string;
      conversions: string;
      conversion_value: string;
    }>(
      `SELECT
         COALESCE(SUM(daily.total_views),0)::bigint AS total_views,
         COALESCE(SUM(daily.total_clicks),0)::bigint AS total_clicks,
         COALESCE(SUM(daily.conversions),0)::bigint AS conversions,
         COALESCE(SUM(daily.conversion_value),0)::numeric AS conversion_value
       FROM analytics_page_daily daily
       JOIN public_pages page ON page.id = daily.public_page_id
       WHERE ${where.join(' AND ')}`,
      values,
    );
    const row = result.rows[0];

    // Daily rows hold additive totals. Exact uniques for the selected range
    // come directly from the event log.
    const uniqueResult = await this.database.query<{
      unique_views: string;
      unique_clickers: string;
    }>(
      `SELECT
         COUNT(DISTINCT event.visitor_id) FILTER (WHERE event.event_name = 'page_view')::bigint AS unique_views,
         COUNT(DISTINCT event.visitor_id) FILTER (WHERE event.event_name = ANY($6::varchar[]))::bigint AS unique_clickers
       FROM analytics_events event
       JOIN public_pages page ON page.id = event.public_page_id
       WHERE page.business_id = $1
         AND ($2::uuid IS NULL OR page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2)
         AND ($3::varchar IS NULL OR page.page_type = $3)
         AND ($4::date IS NULL OR event.occurred_at >= $4::date)
         AND ($5::date IS NULL OR event.occurred_at < $5::date + interval '1 day')`,
      [
        businessId,
        filters.pageId || null,
        filters.pageType || null,
        filters.from || null,
        filters.to || null,
        [...CLICK_EVENTS],
      ],
    );
    const uniques = uniqueResult.rows[0];

    return {
      total_views: Number(row.total_views),
      unique_views: Number(uniques.unique_views),
      unique_visitors: Number(uniques.unique_views),
      total_clicks: Number(row.total_clicks),
      unique_clicks: Number(uniques.unique_clickers),
      unique_clickers: Number(uniques.unique_clickers),
      conversions: Number(row.conversions),
      conversion_value: Number(row.conversion_value),
    };
  }

  async getDaily(
    businessId: string,
    pageId: string,
    days: number,
  ): Promise<
    Array<{
      date: string;
      views: number;
      uniqueVisitors: number;
      clicks: number;
      uniqueClickers: number;
      conversions: number;
    }>
  > {
    const result = await this.database.query<{
      day: string;
      total_views: string;
      unique_visitors: string;
      total_clicks: string;
      unique_clickers: string;
      conversions: string;
    }>(
      // Views/clicks/conversions are additive rollup totals; exact daily
      // uniques are computed from the event log.
      `WITH target_page AS (
         SELECT page.id,
                (now() AT TIME ZONE page.timezone)::date AS local_today
         FROM public_pages page
         WHERE page.business_id = $1
           AND (page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2)
       ),
       day_uniques AS (
         SELECT (event.occurred_at AT TIME ZONE page.timezone)::date AS day,
                COUNT(DISTINCT event.visitor_id)
                  FILTER (WHERE event.event_name = 'page_view')::bigint AS unique_visitors,
                COUNT(DISTINCT event.visitor_id)
                  FILTER (WHERE event.event_name = ANY($4::varchar[]))::bigint AS unique_clickers
         FROM analytics_events event
         JOIN public_pages page ON page.id = event.public_page_id
         JOIN target_page target ON target.id = page.id
         WHERE (event.occurred_at AT TIME ZONE page.timezone)::date >= target.local_today - ($3::integer - 1)
         GROUP BY 1
       )
       SELECT daily.day, daily.total_views, daily.total_clicks, daily.conversions,
              COALESCE(du.unique_visitors, 0)::bigint AS unique_visitors,
              COALESCE(du.unique_clickers, 0)::bigint AS unique_clickers
       FROM analytics_page_daily daily
       JOIN target_page target ON target.id = daily.public_page_id
       LEFT JOIN day_uniques du ON du.day = daily.day
       WHERE daily.business_id = $1
         AND daily.day >= target.local_today - ($3::integer - 1)
       ORDER BY daily.day ASC`,
      [
        businessId,
        pageId,
        Math.min(Math.max(days, 1), 3650),
        [...CLICK_EVENTS],
      ],
    );
    return result.rows.map((row) => ({
      date: String(row.day).slice(0, 10),
      views: Number(row.total_views),
      uniqueVisitors: Number(row.unique_visitors),
      clicks: Number(row.total_clicks),
      uniqueClickers: Number(row.unique_clickers),
      conversions: Number(row.conversions),
    }));
  }

  async clear(businessId: string, pageId?: string): Promise<void> {
    await this.database.transaction(async (client) => {
      let pageIds: string[] | null = null;
      if (pageId) {
        const result = await client.query<{ id: string }>(
          `SELECT id FROM public_pages
           WHERE business_id = $1
             AND (id = $2 OR source_linktree_id = $2 OR source_mini_website_id = $2)`,
          [businessId, pageId],
        );
        if (!result.rows[0])
          throw new NotFoundException('Public page not found');
        pageIds = result.rows.map((row) => row.id);
      }
      if (pageIds) {
        await client.query(
          'DELETE FROM analytics_events WHERE business_id = $1 AND public_page_id = ANY($2::uuid[])',
          [businessId, pageIds],
        );
        await client.query(
          'DELETE FROM analytics_page_daily WHERE business_id = $1 AND public_page_id = ANY($2::uuid[])',
          [businessId, pageIds],
        );
        await client.query(
          'DELETE FROM analytics_action_daily WHERE business_id = $1 AND public_page_id = ANY($2::uuid[])',
          [businessId, pageIds],
        );
      } else {
        await client.query(
          'DELETE FROM analytics_events WHERE business_id = $1',
          [businessId],
        );
        await client.query(
          'DELETE FROM analytics_page_daily WHERE business_id = $1',
          [businessId],
        );
        await client.query(
          'DELETE FROM analytics_action_daily WHERE business_id = $1',
          [businessId],
        );
      }
      await client.query(
        `DELETE FROM analytics_sessions session
         WHERE session.business_id = $1
           AND NOT EXISTS (SELECT 1 FROM analytics_events event WHERE event.session_id = session.id)`,
        [businessId],
      );
      await client.query(
        `DELETE FROM analytics_visitors visitor
         WHERE visitor.business_id = $1
           AND NOT EXISTS (SELECT 1 FROM analytics_events event WHERE event.visitor_id = visitor.id)`,
        [businessId],
      );
    });
  }

  private canonicalPlatformName(platform: string): string {
    const map: Record<string, string> = {
      whatsapp: 'WhatsApp',
      phone: 'Phone',
      tel: 'Phone',
      email: 'Email',
      mailto: 'Email',
      telegram: 'Telegram',
      viber: 'Viber',
      messenger: 'Messenger',
      signal: 'Signal',
      line: 'Line',
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      snapchat: 'Snapchat',
      x: 'X',
      twitter: 'X',
      linkedin: 'LinkedIn',
      spotify: 'Spotify',
      appstore: 'App Store',
      playstore: 'Google Play',
      location: 'Location',
      website: 'Website',
      link: 'Website',
    };
    const key = platform.trim().toLowerCase();
    return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}
