import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';
import type { PoolClient } from 'pg';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import { DatabaseService } from '../database/database.service';
import { ENTITLEMENT, entitledSql } from '../billing/entitlement-sql';
import type {
  AnalyticsEventName,
  TrackAnalyticsEventDto,
} from './dto/analytics-event.dto';
import type { CrmLeadStatus } from './dto/analytics-crm.dto';

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

/**
 * Event properties that identify a person rather than describe a click.
 *
 * `captureLead` reads these and writes them to `crm_contacts` encrypted; they
 * are stripped from the stored event so the analytics table never holds a
 * plaintext copy of the same details.
 */
const CONTACT_IDENTITY_KEYS = new Set(['name', 'email', 'phone']);

const CRM_STATUS_RANK: Record<Exclude<CrmLeadStatus, 'lost'>, number> = {
  new: 0,
  contacted: 1,
  qualified: 2,
  won: 3,
};

export function automaticCrmStatus(
  eventName: AnalyticsEventName,
  hasProvidedContact = false,
): Exclude<CrmLeadStatus, 'lost'> {
  if (eventName === 'order_completed') return 'won';
  if (
    hasProvidedContact ||
    eventName === 'form_submit' ||
    eventName === 'lead_created' ||
    eventName === 'booking_started' ||
    eventName === 'checkout_started'
  ) {
    return 'qualified';
  }
  if (
    eventName === 'whatsapp_click' ||
    eventName === 'call_click' ||
    eventName === 'email_click'
  ) {
    return 'contacted';
  }
  return 'new';
}

export function crmProspectLockKey(
  businessId: string,
  publicPageId: string,
  visitorId: string,
): string {
  return `crm:${businessId}:${publicPageId}:${visitorId}`;
}

@Injectable()
export class UnifiedAnalyticsService {
  private readonly hashSecret: string;

  constructor(
    private readonly database: DatabaseService,
    config: ConfigService,
    private readonly secrets: SecretCryptoService,
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
    return /bot|crawler|spider|headless|preview|facebookexternalhit|bytespider/i.test(
      userAgent,
    );
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
      `SELECT id, label, action_type, tiktok_event
       FROM public_page_actions
       WHERE public_page_id = $1
         AND status = 'active'
         AND (id = $2::uuid OR source_link_id = $2::uuid)
       LIMIT 1`,
      [pageId, sourceOrActionId],
    );
    if (!result.rows[0]) {
      throw new BadRequestException(
        'The analytics action does not belong to this public page',
      );
    }
    return result.rows[0];
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
    // A `form_submit` carries the visitor's name, email and phone so the CRM
    // can encrypt them onto the contact. The event row is not that place: it is
    // never read back for those keys, so storing a second plaintext copy there
    // would only widen what a leaked analytics table exposes.
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

      if (!bot && consent !== 'denied') {
        const contactEvent =
          input.eventName === 'form_submit' ||
          input.eventName === 'lead_created';
        const prospectEvent =
          input.eventName === 'page_view' ||
          input.eventName === 'engaged_view' ||
          CLICK_EVENTS.has(input.eventName);

        if (contactEvent) {
          await this.captureLead(client, {
            businessId: page.business_id,
            publicPageId: page.id,
            visitorId,
            sessionId,
            sourceEventId: databaseEventId,
            properties: input.properties || {},
            value: input.conversionValue,
            currency: input.currency,
            context,
            device,
            channel,
            attribution,
            consent,
          });
        } else if (prospectEvent) {
          await this.captureAutomaticProspect(client, {
            businessId: page.business_id,
            publicPageId: page.id,
            visitorId,
            sessionId,
            sourceEventId: databaseEventId,
            eventName: input.eventName,
            actionLabel: action?.label || null,
            context,
            device,
            channel,
            attribution,
            consent,
          });
        }
      }

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
          visitorId,
          databaseEventId,
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
        const payload = {
          event: tikTokName,
          event_time: Math.floor(new Date(occurredAt).getTime() / 1000),
          event_id: input.eventId,
          url: input.pageUrl,
          referrer: input.referrer || context.referrer,
          content_id: action?.id || page.id,
          content_ids: [action?.id || page.id],
          content_type: action ? action.action_type : page.page_type,
          content_name: action?.label || page.name,
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
             AND (
               business.account_type = 'platform'
               OR (
                 business.account_type = 'business'
                 AND ${entitledSql(ENTITLEMENT.tiktok)}
               )
             )
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

  private propertyText(
    properties: Record<string, unknown>,
    key: string,
    maximum: number,
  ): string {
    const value = properties[key];
    return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
  }

  private async advanceLeadStatus(
    client: PoolClient,
    leadId: string,
    nextStatus: Exclude<CrmLeadStatus, 'lost'>,
  ): Promise<void> {
    if (nextStatus === 'new') return;
    const current = await client.query<{ status: CrmLeadStatus }>(
      `SELECT status FROM crm_leads WHERE id = $1 FOR UPDATE`,
      [leadId],
    );
    const currentStatus = current.rows[0]?.status;
    if (!currentStatus || currentStatus === 'lost') return;
    if (CRM_STATUS_RANK[currentStatus] >= CRM_STATUS_RANK[nextStatus]) return;
    await client.query(
      `UPDATE crm_leads
       SET status = $2, updated_at = now()
       WHERE id = $1`,
      [leadId, nextStatus],
    );
    await client.query(
      `INSERT INTO crm_lead_status_history (lead_id, from_status, to_status)
       VALUES ($1,$2,$3)`,
      [leadId, currentStatus, nextStatus],
    );
  }

  private async captureAutomaticProspect(
    client: PoolClient,
    input: {
      businessId: string;
      publicPageId: string;
      visitorId: string;
      sessionId: string;
      sourceEventId: string;
      eventName: AnalyticsEventName;
      actionLabel: string | null;
      context: AnalyticsRequestContext;
      device: {
        deviceType: string;
        browser: string;
        operatingSystem: string;
      };
      channel: AnalyticsChannel;
      attribution: Record<string, string | undefined>;
      consent: string;
    },
  ): Promise<void> {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [
        crmProspectLockKey(
          input.businessId,
          input.publicPageId,
          input.visitorId,
        ),
      ],
    );

    const attributes = {
      captureMethod: 'automatic',
      deviceType: input.device.deviceType,
      browser: input.device.browser,
      operatingSystem: input.device.operatingSystem,
      lastEvent: input.eventName,
      lastAction: input.actionLabel,
    };
    const existingContact = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_contacts
       WHERE business_id = $1 AND visitor_id = $2
       LIMIT 1
       FOR UPDATE`,
      [input.businessId, input.visitorId],
    );
    let contactId = existingContact.rows[0]?.id;

    if (contactId) {
      await client.query(
        `UPDATE crm_contacts
         SET country_code = COALESCE($2, country_code),
             region = COALESCE($3, region),
             city = COALESCE($4, city),
             ads_consent = CASE
               WHEN $5 = 'unknown' THEN ads_consent
               ELSE $5
             END,
             attributes = attributes || $6::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          contactId,
          input.context.countryCode || null,
          input.context.region || null,
          input.context.city || null,
          input.consent,
          JSON.stringify(attributes),
        ],
      );
    } else {
      const insertedContact = await client.query<{ id: string }>(
        `INSERT INTO crm_contacts (
           business_id, visitor_id, country_code, region, city,
           ads_consent, attributes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         RETURNING id`,
        [
          input.businessId,
          input.visitorId,
          input.context.countryCode || null,
          input.context.region || null,
          input.context.city || null,
          input.consent,
          JSON.stringify(attributes),
        ],
      );
      contactId = insertedContact.rows[0].id;
    }

    const automaticStatus = automaticCrmStatus(input.eventName);
    const score =
      automaticStatus === 'won'
        ? 100
        : automaticStatus === 'qualified'
          ? 75
          : automaticStatus === 'contacted'
            ? 55
            : input.eventName === 'page_view'
              ? 10
              : input.eventName === 'engaged_view'
                ? 25
                : 40;
    const metadata = {
      captureMethod: 'automatic',
      lastEvent: input.eventName,
      lastAction: input.actionLabel,
    };
    const existingLead = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_leads
       WHERE business_id = $1
         AND public_page_id = $2
         AND visitor_id = $3
       LIMIT 1
       FOR UPDATE`,
      [input.businessId, input.publicPageId, input.visitorId],
    );
    let leadId = existingLead.rows[0]?.id;
    let inserted = false;

    if (leadId) {
      await client.query(
        `UPDATE crm_leads
         SET contact_id = COALESCE(contact_id, $2),
             session_id = $3,
             channel = COALESCE($4, channel),
             attribution = attribution || $5::jsonb,
             score = GREATEST(COALESCE(score, 0), $6),
             metadata = metadata || $7::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          leadId,
          contactId,
          input.sessionId,
          input.channel,
          JSON.stringify(input.attribution),
          score,
          JSON.stringify(metadata),
        ],
      );
    } else {
      const lead = await client.query<{ id: string }>(
        `INSERT INTO crm_leads (
           business_id, public_page_id, contact_id, visitor_id, session_id,
           source_event_id, channel, attribution, score, metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb)
         RETURNING id`,
        [
          input.businessId,
          input.publicPageId,
          contactId,
          input.visitorId,
          input.sessionId,
          input.sourceEventId,
          input.channel,
          JSON.stringify(input.attribution),
          score,
          JSON.stringify(metadata),
        ],
      );
      leadId = lead.rows[0].id;
      inserted = true;
    }

    if (inserted) {
      await client.query(
        `INSERT INTO crm_lead_status_history (lead_id, to_status)
         VALUES ($1, 'new')`,
        [leadId],
      );
    }
    await this.advanceLeadStatus(client, leadId, automaticStatus);
    await client.query(
      `INSERT INTO crm_lead_events (
         lead_id, analytics_event_id, event_type, metadata
       ) VALUES ($1,$2,$3,$4::jsonb)`,
      [
        leadId,
        input.sourceEventId,
        input.eventName,
        JSON.stringify({ actionLabel: input.actionLabel }),
      ],
    );
  }

  private async captureLead(
    client: PoolClient,
    input: {
      businessId: string;
      publicPageId: string;
      visitorId: string;
      sessionId: string;
      sourceEventId: string;
      properties: Record<string, unknown>;
      value?: number;
      currency?: string;
      context: AnalyticsRequestContext;
      device: {
        deviceType: string;
        browser: string;
        operatingSystem: string;
      };
      channel: AnalyticsChannel;
      attribution: Record<string, string | undefined>;
      consent: string;
    },
  ): Promise<void> {
    const name = this.propertyText(input.properties, 'name', 255);
    const email = this.propertyText(
      input.properties,
      'email',
      320,
    ).toLowerCase();
    const phone = this.propertyText(input.properties, 'phone', 40).replace(
      /[^\d+]/g,
      '',
    );
    const emailHmac = email ? this.hmac(email) : null;
    const phoneHmac = phone ? this.hmac(phone) : null;
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [
        crmProspectLockKey(
          input.businessId,
          input.publicPageId,
          input.visitorId,
        ),
      ],
    );

    const existing = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_contacts
       WHERE business_id = $1
         AND (
           visitor_id = $2
           OR ($3::char(64) IS NOT NULL AND email_hmac = $3)
           OR ($4::char(64) IS NOT NULL AND phone_hmac = $4)
         )
       ORDER BY (visitor_id = $2) DESC, updated_at DESC
       LIMIT 1
       FOR UPDATE`,
      [input.businessId, input.visitorId, emailHmac, phoneHmac],
    );
    let contactId = existing.rows[0]?.id;
    const attributes = {
      captureMethod: name || email || phone ? 'provided' : 'automatic',
      deviceType: input.device.deviceType,
      browser: input.device.browser,
      operatingSystem: input.device.operatingSystem,
    };

    if (contactId) {
      await client.query(
        `UPDATE crm_contacts
         SET visitor_id = COALESCE(visitor_id, $2),
             encrypted_name = COALESCE($3, encrypted_name),
             encrypted_email = COALESCE($4, encrypted_email),
             encrypted_phone = COALESCE($5, encrypted_phone),
             email_hmac = COALESCE($6, email_hmac),
             phone_hmac = COALESCE($7, phone_hmac),
             country_code = COALESCE($8, country_code),
             region = COALESCE($9, region),
             city = COALESCE($10, city),
             ads_consent = CASE
               WHEN $11 = 'unknown' THEN ads_consent
               ELSE $11
             END,
             attributes = attributes || $12::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          contactId,
          input.visitorId,
          name ? this.secrets.encryptText(name) : null,
          email ? this.secrets.encryptText(email) : null,
          phone ? this.secrets.encryptText(phone) : null,
          emailHmac,
          phoneHmac,
          input.context.countryCode || null,
          input.context.region || null,
          input.context.city || null,
          input.consent,
          JSON.stringify(attributes),
        ],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO crm_contacts (
           business_id, visitor_id, encrypted_name, encrypted_email,
           encrypted_phone, email_hmac, phone_hmac, country_code, region,
           city, ads_consent, attributes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
         RETURNING id`,
        [
          input.businessId,
          input.visitorId,
          name ? this.secrets.encryptText(name) : null,
          email ? this.secrets.encryptText(email) : null,
          phone ? this.secrets.encryptText(phone) : null,
          emailHmac,
          phoneHmac,
          input.context.countryCode || null,
          input.context.region || null,
          input.context.city || null,
          input.consent,
          JSON.stringify(attributes),
        ],
      );
      contactId = inserted.rows[0].id;
    }

    const metadata = { ...input.properties };
    delete metadata.name;
    delete metadata.email;
    delete metadata.phone;
    metadata.captureMethod = name || email || phone ? 'provided' : 'automatic';
    const existingLead = await client.query<{ id: string }>(
      `SELECT id
       FROM crm_leads
       WHERE business_id = $1
         AND public_page_id = $2
         AND visitor_id = $3
       LIMIT 1
       FOR UPDATE`,
      [input.businessId, input.publicPageId, input.visitorId],
    );
    let leadId = existingLead.rows[0]?.id;
    let insertedLead = false;

    if (leadId) {
      await client.query(
        `UPDATE crm_leads
         SET contact_id = $2,
             session_id = $3,
             source_event_id = $4,
             value = COALESCE($5, value),
             currency = COALESCE($6, currency),
             channel = COALESCE($7, channel),
             attribution = attribution || $8::jsonb,
             score = GREATEST(COALESCE(score, 0), 70),
             metadata = metadata || $9::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          leadId,
          contactId,
          input.sessionId,
          input.sourceEventId,
          input.value ?? null,
          input.currency || null,
          input.channel,
          JSON.stringify(input.attribution),
          JSON.stringify(metadata),
        ],
      );
    } else {
      const lead = await client.query<{ id: string }>(
        `INSERT INTO crm_leads (
           business_id, public_page_id, contact_id, visitor_id, session_id,
           source_event_id, value, currency, channel, attribution, score,
           metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,70,$11::jsonb)
         RETURNING id`,
        [
          input.businessId,
          input.publicPageId,
          contactId,
          input.visitorId,
          input.sessionId,
          input.sourceEventId,
          input.value ?? null,
          input.currency || null,
          input.channel,
          JSON.stringify(input.attribution),
          JSON.stringify(metadata),
        ],
      );
      leadId = lead.rows[0].id;
      insertedLead = true;
    }

    if (insertedLead) {
      await client.query(
        `INSERT INTO crm_lead_status_history (lead_id, to_status)
         VALUES ($1, 'new')`,
        [leadId],
      );
    }
    await this.advanceLeadStatus(
      client,
      leadId,
      automaticCrmStatus('lead_created', Boolean(name || email || phone)),
    );
    await client.query(
      `INSERT INTO crm_lead_events (
         lead_id, analytics_event_id, event_type, metadata
       ) VALUES ($1,$2,'contact_captured',$3::jsonb)`,
      [leadId, input.sourceEventId, JSON.stringify(metadata)],
    );
  }

  private async updateRollups(
    client: PoolClient,
    input: {
      page: PublicPageRow;
      action: ActionRow | null;
      visitorId: string;
      databaseEventId: string;
      eventName: AnalyticsEventName;
      occurredAt: string;
      conversionValue: number;
    },
  ): Promise<void> {
    const isView = input.eventName === 'page_view';
    const isClick = CLICK_EVENTS.has(input.eventName);
    const isConversion = CONVERSION_EVENTS.has(input.eventName);
    // First-ever, not first-today: a visitor who returns tomorrow is still
    // the same person, not a second one. This feeds `new_visitors`/
    // `new_clickers` below — a "new visitor acquisition" trend column, one
    // row per day, each visitor credited only to the single day they were
    // first seen. It is not what "unique visitors" means for reporting —
    // that's computed live from analytics_events (COUNT(DISTINCT)) by every
    // read path that needs it (getSummary, getActions, getPages, ...).
    const uniqueResult = await client.query<{
      first_view: boolean;
      first_click: boolean;
      first_action_click: boolean;
    }>(
      `SELECT
         NOT EXISTS (
           SELECT 1 FROM analytics_events event
           WHERE event.public_page_id = $1
             AND event.visitor_id = $2
             AND event.event_name = 'page_view'
             AND event.id <> $3
         ) AS first_view,
         NOT EXISTS (
           SELECT 1 FROM analytics_events event
           WHERE event.public_page_id = $1
             AND event.visitor_id = $2
             AND event.event_name = ANY($4::varchar[])
             AND event.id <> $3
         ) AS first_click,
         NOT EXISTS (
           SELECT 1 FROM analytics_events event
           WHERE event.public_page_action_id = $5
             AND event.visitor_id = $2
             AND event.event_name = ANY($4::varchar[])
             AND event.id <> $3
         ) AS first_action_click`,
      [
        input.page.id,
        input.visitorId,
        input.databaseEventId,
        [...CLICK_EVENTS],
        input.action?.id || null,
      ],
    );
    const unique = uniqueResult.rows[0];

    await client.query(
      `INSERT INTO analytics_page_daily (
         business_id, public_page_id, day, timezone, total_views,
         new_visitors, total_clicks, new_clickers, conversions,
         conversion_value
       ) VALUES (
         $1, $2, ($3::timestamptz AT TIME ZONE $4)::date, $4,
         $5, $6, $7, $8, $9, $10
       )
       ON CONFLICT (public_page_id, day, timezone) DO UPDATE SET
         total_views = analytics_page_daily.total_views + EXCLUDED.total_views,
         new_visitors = analytics_page_daily.new_visitors + EXCLUDED.new_visitors,
         total_clicks = analytics_page_daily.total_clicks + EXCLUDED.total_clicks,
         new_clickers = analytics_page_daily.new_clickers + EXCLUDED.new_clickers,
         conversions = analytics_page_daily.conversions + EXCLUDED.conversions,
         conversion_value = analytics_page_daily.conversion_value + EXCLUDED.conversion_value,
         updated_at = now()`,
      [
        input.page.business_id,
        input.page.id,
        input.occurredAt,
        input.page.timezone,
        isView ? 1 : 0,
        isView && unique.first_view ? 1 : 0,
        isClick ? 1 : 0,
        isClick && unique.first_click ? 1 : 0,
        isConversion ? 1 : 0,
        input.conversionValue,
      ],
    );

    if (input.action && isClick) {
      await client.query(
        `INSERT INTO analytics_action_daily (
           business_id, public_page_id, public_page_action_id, day, timezone,
           total_clicks, new_clickers, conversions, conversion_value
         ) VALUES (
           $1,$2,$3,($4::timestamptz AT TIME ZONE $5)::date,$5,$6,$7,$8,$9
         )
         ON CONFLICT (public_page_action_id, day, timezone) DO UPDATE SET
           total_clicks = analytics_action_daily.total_clicks + EXCLUDED.total_clicks,
           new_clickers = analytics_action_daily.new_clickers + EXCLUDED.new_clickers,
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
          unique.first_action_click ? 1 : 0,
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

    // Uniques are read straight from the event log rather than the daily
    // rollup: the rollup's `unique_visitors`/`unique_clickers` only mark a
    // visitor's first-ever event, so summing it over a date range answers
    // "new visitors in range", not "active unique visitors in range" — a
    // returning visitor whose first-ever visit predates the range would
    // otherwise silently count as zero. A direct COUNT(DISTINCT) is exact
    // for any range at this project's scale.
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

    const engagementResult = await this.database.query<{
      new_visitors: string;
      returning_visitors: string;
      total_sessions: string;
      bounced_sessions: string;
      avg_engagement_seconds: string;
    }>(
      `WITH scoped_sessions AS (
         SELECT s.id, s.visitor_id, s.event_count, s.engagement_seconds
         FROM analytics_sessions s
         JOIN public_pages page ON page.id = s.landing_public_page_id
         WHERE s.business_id = $1
           AND s.is_bot = false
           AND (
             $2::uuid IS NULL
             OR page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2
           )
           AND ($3::varchar IS NULL OR page.page_type = $3)
           AND ($4::date IS NULL OR s.started_at >= $4::date)
           AND ($5::date IS NULL OR s.started_at < $5::date + interval '1 day')
       ),
       scoped_visitors AS (
         SELECT DISTINCT ss.visitor_id, v.first_seen_at
         FROM scoped_sessions ss
         JOIN analytics_visitors v ON v.id = ss.visitor_id
       )
       SELECT
         COUNT(*) FILTER (
           WHERE first_seen_at >= COALESCE($4::date, '-infinity'::date)
             AND first_seen_at < COALESCE($5::date + interval '1 day', 'infinity'::date)
         )::bigint AS new_visitors,
         COUNT(*) FILTER (
           WHERE NOT (
             first_seen_at >= COALESCE($4::date, '-infinity'::date)
             AND first_seen_at < COALESCE($5::date + interval '1 day', 'infinity'::date)
           )
         )::bigint AS returning_visitors,
         (SELECT COUNT(*) FROM scoped_sessions)::bigint AS total_sessions,
         (SELECT COUNT(*) FILTER (WHERE event_count <= 1) FROM scoped_sessions)::bigint AS bounced_sessions,
         (SELECT COALESCE(AVG(engagement_seconds), 0) FROM scoped_sessions) AS avg_engagement_seconds
       FROM scoped_visitors`,
      [
        businessId,
        filters.pageId || null,
        filters.pageType || null,
        filters.from || null,
        filters.to || null,
      ],
    );
    const engagement = engagementResult.rows[0];
    const totalSessions = Number(engagement.total_sessions);
    const bouncedSessions = Number(engagement.bounced_sessions);
    const newVisitors = Number(engagement.new_visitors);
    const returningVisitors = Number(engagement.returning_visitors);

    return {
      total_views: Number(row.total_views),
      unique_views: Number(uniques.unique_views),
      unique_visitors: Number(uniques.unique_views),
      total_clicks: Number(row.total_clicks),
      unique_clicks: Number(uniques.unique_clickers),
      unique_clickers: Number(uniques.unique_clickers),
      conversions: Number(row.conversions),
      conversion_value: Number(row.conversion_value),
      new_visitors: newVisitors,
      returning_visitors: returningVisitors,
      returning_rate:
        newVisitors + returningVisitors > 0
          ? (returningVisitors / (newVisitors + returningVisitors)) * 100
          : 0,
      bounce_rate:
        totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0,
      avg_engagement_seconds: Number(engagement.avg_engagement_seconds),
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
      // Views/clicks/conversions stay additive sums from the rollup. Uniques
      // are computed live, per day, from the event log: the rollup's
      // new_visitors/new_clickers only mark a visitor's first-ever event
      // (see updateRollups), which is a different, "new acquisition" number,
      // not "how many distinct people were active this day".
      `WITH day_uniques AS (
         SELECT (event.occurred_at AT TIME ZONE page.timezone)::date AS day,
                COUNT(DISTINCT event.visitor_id)
                  FILTER (WHERE event.event_name = 'page_view')::bigint AS unique_visitors,
                COUNT(DISTINCT event.visitor_id)
                  FILTER (WHERE event.event_name = ANY($4::varchar[]))::bigint AS unique_clickers
         FROM analytics_events event
         JOIN public_pages page ON page.id = event.public_page_id
         WHERE page.business_id = $1
           AND (page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2)
           AND (event.occurred_at AT TIME ZONE page.timezone)::date >= current_date - ($3::integer - 1)
         GROUP BY 1
       )
       SELECT daily.day, daily.total_views, daily.total_clicks, daily.conversions,
              COALESCE(du.unique_visitors, 0)::bigint AS unique_visitors,
              COALESCE(du.unique_clickers, 0)::bigint AS unique_clickers
       FROM analytics_page_daily daily
       JOIN public_pages page ON page.id = daily.public_page_id
       LEFT JOIN day_uniques du ON du.day = daily.day
       WHERE daily.business_id = $1
         AND (page.id = $2 OR page.source_linktree_id = $2 OR page.source_mini_website_id = $2)
         AND daily.day >= current_date - ($3::integer - 1)
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

  async getTimeline(
    businessId: string,
    days: number,
    filters: {
      pageId?: string;
      pageType?: 'linktree' | 'mini_website';
    } = {},
  ) {
    const boundedDays = Math.min(Math.max(days, 1), 3650);
    const result = await this.database.query<{
      day: string;
      total_views: string;
      unique_visitors: string;
      total_clicks: string;
      unique_clickers: string;
      conversions: string;
    }>(
      // Same split as getDaily: additive sums from the rollup for
      // views/clicks/conversions, uniques computed live per day from the
      // event log rather than the rollup's new_visitors/new_clickers
      // (a different, "new acquisition" metric — see updateRollups).
      `WITH days AS (
         SELECT generate_series(
           current_date - ($2::integer - 1),
           current_date,
           interval '1 day'
         )::date AS day
       ),
       totals AS (
         SELECT daily.day,
                SUM(daily.total_views)::bigint AS total_views,
                SUM(daily.total_clicks)::bigint AS total_clicks,
                SUM(daily.conversions)::bigint AS conversions
         FROM analytics_page_daily daily
         JOIN public_pages page ON page.id = daily.public_page_id
         WHERE daily.business_id = $1
           AND (
             $3::uuid IS NULL
             OR page.id = $3
             OR page.source_linktree_id = $3
             OR page.source_mini_website_id = $3
           )
           AND ($4::varchar IS NULL OR page.page_type = $4)
           AND daily.day >= current_date - ($2::integer - 1)
         GROUP BY daily.day
       ),
       day_uniques AS (
         SELECT (event.occurred_at AT TIME ZONE page.timezone)::date AS day,
                COUNT(DISTINCT event.visitor_id)
                  FILTER (WHERE event.event_name = 'page_view')::bigint AS unique_visitors,
                COUNT(DISTINCT event.visitor_id)
                  FILTER (WHERE event.event_name = ANY($5::varchar[]))::bigint AS unique_clickers
         FROM analytics_events event
         JOIN public_pages page ON page.id = event.public_page_id
         WHERE page.business_id = $1
           AND (
             $3::uuid IS NULL
             OR page.id = $3
             OR page.source_linktree_id = $3
             OR page.source_mini_website_id = $3
           )
           AND ($4::varchar IS NULL OR page.page_type = $4)
           AND (event.occurred_at AT TIME ZONE page.timezone)::date >= current_date - ($2::integer - 1)
         GROUP BY 1
       )
       SELECT days.day,
              COALESCE(totals.total_views, 0)::bigint AS total_views,
              COALESCE(du.unique_visitors, 0)::bigint AS unique_visitors,
              COALESCE(totals.total_clicks, 0)::bigint AS total_clicks,
              COALESCE(du.unique_clickers, 0)::bigint AS unique_clickers,
              COALESCE(totals.conversions, 0)::bigint AS conversions
       FROM days
       LEFT JOIN totals USING (day)
       LEFT JOIN day_uniques du USING (day)
       ORDER BY days.day ASC`,
      [
        businessId,
        boundedDays,
        filters.pageId || null,
        filters.pageType || null,
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
}
