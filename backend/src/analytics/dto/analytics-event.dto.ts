import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'engaged_view',
  'button_click',
  'whatsapp_click',
  'call_click',
  'email_click',
  'social_click',
  'product_click',
  'service_click',
  'form_submit',
  'lead_created',
  'booking_started',
  'checkout_started',
  'order_completed',
  'download',
  // Richer interactions public pages can produce: opening
  // a section, a gallery or a player; reaching the form; sharing the page.
  // Already accepted by the events table — only this list was holding them out.
  'action_open',
  'form_view',
  'share',
  'custom',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export class TrackAnalyticsEventDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  pageId: string;

  @IsOptional()
  @IsUUID()
  actionId?: string;

  @IsIn(ANALYTICS_EVENT_NAMES)
  eventName: AnalyticsEventName;

  @IsString()
  @Length(8, 128)
  visitorId: string;

  @IsString()
  @Length(8, 128)
  sessionId: string;

  @IsISO8601({ strict: true })
  occurredAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ttclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ttp?: string;

  @IsOptional()
  @IsIn(['unknown', 'granted', 'denied'])
  consentState?: 'unknown' | 'granted' | 'denied';

  @IsOptional()
  @IsBoolean()
  browserDispatched?: boolean;

  /**
   * The TikTok event name the browser's pixel already fired for this id.
   *
   * Deduplication matches on the pair, so the server has to report the same
   * name rather than re-deriving one that may differ. Ignored unless
   * `browserDispatched` is set.
   */
  @IsOptional()
  @IsIn([
    'ViewContent',
    'ClickButton',
    'Contact',
    'Lead',
    'SubmitForm',
    'CompleteRegistration',
    'InitiateCheckout',
    'CompletePayment',
    'Download',
    'Search',
    'AddToCart',
    'PlaceAnOrder',
  ])
  browserEventName?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  conversionValue?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class TrackAnalyticsBatchDto {
  @IsArray()
  @ArrayMaxSize(50)
  events: unknown[];
}

/**
 * The first-party navigation handoff used by outbound public-page actions.
 *
 * Query strings are strings at the HTTP boundary. In particular,
 * `browserDispatched` deliberately stays a string here: class-transformer's
 * generic boolean conversion treats the non-empty string `"false"` as true.
 */
export class TrackAnalyticsRedirectDto {
  @IsUUID()
  eventId: string;

  @IsIn(ANALYTICS_EVENT_NAMES)
  eventName: AnalyticsEventName;

  @IsString()
  @Length(8, 128)
  visitorId: string;

  @IsString()
  @Length(8, 128)
  sessionId: string;

  @IsISO8601({ strict: true })
  occurredAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ttclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ttp?: string;

  @IsOptional()
  @IsIn(['unknown', 'granted', 'denied'])
  consentState?: 'unknown' | 'granted' | 'denied';

  @IsOptional()
  @IsIn(['true', 'false'])
  browserDispatched?: 'true' | 'false';

  @IsOptional()
  @IsIn([
    'ViewContent',
    'ClickButton',
    'Contact',
    'Lead',
    'SubmitForm',
    'CompleteRegistration',
    'InitiateCheckout',
    'CompletePayment',
    'Download',
    'Search',
    'AddToCart',
    'PlaceAnOrder',
  ])
  browserEventName?: string;

  /** Optional prefilled text for a registered WhatsApp/Telegram destination. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
