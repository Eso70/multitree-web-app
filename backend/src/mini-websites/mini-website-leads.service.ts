import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  MiniWebsiteLeadField,
  MiniWebsiteLeadForm,
} from '@linktree/types';
import { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import type { AnalyticsRequestContext } from '../analytics/unified-analytics.service';
import { DatabaseService } from '../database/database.service';
import { toText } from '../common/coerce';
import { MINI_WEBSITE_MAX_LEAD_ANSWER_LENGTH } from './mini-website.constants';
import { MiniWebsitesService } from './mini-websites.service';
import type { SubmitMiniWebsiteLeadDto } from './dto/mini-website-lead.dto';

/** How the page identifies itself to the CRM and to TikTok. */
const LEAD_SOURCE = 'mini_website_form';

/** What `analytics_events.event_id` will accept; anything else is not an id we can store. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface LeadFormPage {
  id: string;
  businessId: string;
  leadForm: MiniWebsiteLeadForm;
}

/**
 * Public submissions of a mini website's lead form.
 *
 * Nothing is stored by this service directly. A submission is turned into a
 * `form_submit` analytics event and handed to the shared ingest, which is what
 * already knows how to create the visitor, the session, the encrypted CRM
 * contact and the lead, advance the lead's status, roll up the daily counters,
 * and queue the TikTok `Lead` conversion. Writing leads a second way here would
 * mean two paths that have to stay in step and only one of them tested.
 */
@Injectable()
export class MiniWebsiteLeadsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly websites: MiniWebsitesService,
    private readonly analytics: UnifiedAnalyticsService,
  ) {}

  /**
   * Loads the published page's form, or explains why there is nothing to fill.
   *
   * Read straight from the database rather than through `getPublic`, which also
   * fetches pixels and action keys a submission has no use for.
   */
  private async loadForm(
    subdomain: string,
    slug: string,
    ownerId?: string,
  ): Promise<LeadFormPage> {
    const result = await this.database.query<{
      id: string;
      business_id: string;
      lead_form_enabled: boolean;
      lead_form: unknown;
      lead_fields: unknown;
    }>(
      `SELECT website.id,
              website.business_id,
              EXISTS (
                SELECT 1 FROM mini_website_sections section
                 WHERE section.mini_website_id = website.id
                   AND section.section_key = 'leadForm'
                   AND section.enabled
              ) AS lead_form_enabled,
              (SELECT json_build_object(
                        'title', form.title,
                        'description', form.description,
                        'submitLabel', form.submit_label,
                        'successMessage', form.success_message,
                        'consentText', form.consent_text,
                        'consentRequired', form.consent_required)
                 FROM mini_website_lead_forms form
                WHERE form.mini_website_id = website.id) AS lead_form,
              (SELECT COALESCE(json_agg(json_build_object(
                        'id', item.item_key,
                        'label', item.title,
                        'helpText', item.subtitle,
                        'type', item.role,
                        'mapping', item.issuer,
                        'placeholder', item.action_label,
                        'required', item.required,
                        'options', item.options) ORDER BY item.position), '[]'::json)
                 FROM mini_website_items item
                WHERE item.mini_website_id = website.id
                  AND item.section_key = 'leadForm') AS lead_fields
         FROM mini_websites website
         JOIN businesses business ON business.id = website.business_id
        WHERE (
          ($3::uuid IS NULL AND lower(business.subdomain) = lower($1) AND business.account_type='business')
          OR ($3::uuid IS NOT NULL AND business.id = $3::uuid AND business.account_type='platform')
        )
          AND website.slug = $2
          AND website.status = 'published'`,
      [subdomain, slug, ownerId || null],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Mini website not found');
    if (!row.lead_form_enabled)
      throw new NotFoundException('This page has no form');
    const leadForm = this.websites.readLeadForm(row.lead_form, row.lead_fields);
    if (!leadForm.fields.length)
      throw new NotFoundException('This page has no form');
    return { id: row.id, businessId: row.business_id, leadForm };
  }

  /**
   * Turns one raw answer into the text that will be stored, or rejects it.
   *
   * Every field is read from the saved definition rather than from the payload,
   * so a submission cannot invent a question, answer one that was removed, or
   * smuggle a longer value past the length its type allows.
   */
  private readAnswer(
    field: MiniWebsiteLeadField,
    raw: unknown,
  ): string | undefined {
    if (field.type === 'checkbox') {
      const ticked = raw === true || raw === 'true';
      if (field.required && !ticked)
        throw new BadRequestException(`«${field.label}» is required`);
      return ticked ? 'yes' : '';
    }

    const value = toText(raw)
      .trim()
      .slice(0, MINI_WEBSITE_MAX_LEAD_ANSWER_LENGTH);
    if (!value) {
      if (field.required)
        throw new BadRequestException(`«${field.label}» is required`);
      return '';
    }

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
      throw new BadRequestException(`«${field.label}» is not a valid email`);
    if (field.type === 'phone') {
      const digits = value.replace(/[^\d]/g, '');
      if (digits.length < 6 || digits.length > 20)
        throw new BadRequestException(`«${field.label}» is not a valid number`);
      return value.startsWith('+') ? `+${digits}` : digits;
    }
    if (field.type === 'number' && !/^-?\d+(\.\d+)?$/.test(value))
      throw new BadRequestException(`«${field.label}» must be a number`);
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException(`«${field.label}» must be a date`);
    if (field.type === 'select' && !field.options.includes(value))
      throw new BadRequestException(
        `«${field.label}» is not one of the choices`,
      );
    return value;
  }

  async submit(
    subdomain: string,
    slug: string,
    body: SubmitMiniWebsiteLeadDto,
    context: AnalyticsRequestContext,
    ownerId?: string,
  ): Promise<{ submitted: true; successMessage: string }> {
    const page = await this.loadForm(subdomain, slug, ownerId);
    const { leadForm } = page;
    // A filled honeypot means no human was involved. The reply is deliberately
    // the same shape a real submission gets — a script that is told it failed
    // simply tries again with the field left blank.
    if (body.website?.trim())
      return { submitted: true, successMessage: leadForm.successMessage };

    if (leadForm.consentRequired && body.consent !== true)
      throw new ForbiddenException('Consent is required before sending');

    const answers = body.answers || {};
    const identity: Record<string, string> = {};
    const details: Record<string, string> = {};
    for (const field of leadForm.fields) {
      const value = this.readAnswer(field, answers[field.id]);
      if (!value) continue;
      if (field.mapping === 'none') details[field.label] = value;
      else identity[field.mapping] = value;
    }
    // Guarded in the editor too, but re-checked here: the form may have been
    // published before that rule existed, and a lead nobody can reply to is
    // worse than a rejected submission.
    if (!identity.email && !identity.phone)
      throw new BadRequestException('An email or phone number is required');

    // The browser's id when it sent one, so the pixel event it already fired
    // and this one deduplicate into a single TikTok conversion. Falls back to
    // a fresh id, which yields a server-only lead rather than a lost one.
    //
    // Only a UUID is usable: `analytics_events.event_id` is a `uuid` column, so
    // anything else makes the ingest throw and takes the whole submission down
    // with it. Losing the deduplication link costs one double-counted
    // conversion; rejecting the lead costs the lead, so a malformed id is
    // treated as no id at all rather than as a bad request.
    const browserEventId = UUID_PATTERN.test(body.eventId?.trim() ?? '')
      ? body.eventId?.trim()
      : undefined;
    await this.analytics.ingest(
      {
        eventId: browserEventId || randomUUID(),
        browserDispatched: Boolean(browserEventId),
        browserEventName: browserEventId ? 'Lead' : undefined,
        pageId: page.id,
        eventName: 'form_submit',
        visitorId: body.visitorId,
        sessionId: body.sessionId,
        occurredAt: new Date().toISOString(),
        pageUrl: body.pageUrl,
        referrer: body.referrer,
        // Only an explicit tick is consent. Everything else stays `unknown`,
        // which keeps the contact out of a TikTok custom audience rather than
        // quietly opting the visitor in.
        consentState: body.consent === true ? 'granted' : 'unknown',
        properties: {
          ...identity,
          source: LEAD_SOURCE,
          formTitle: leadForm.title,
          consentText: leadForm.consentText,
          answers: details,
        },
      },
      context,
    );

    return { submitted: true, successMessage: leadForm.successMessage };
  }

  async submitPlatform(
    ownerId: string,
    slug: string,
    body: SubmitMiniWebsiteLeadDto,
    context: AnalyticsRequestContext,
  ) {
    return this.submit('', slug, body, context, ownerId);
  }
}
