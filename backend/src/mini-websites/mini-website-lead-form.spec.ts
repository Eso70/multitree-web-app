import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import type { UnifiedAnalyticsService } from '../analytics/unified-analytics.service';
import { PublicPageAnalyticsService } from '../analytics/public-page-analytics.service';
import { TemplateAccessService } from '../billing/template-access.service';
import { MiniWebsiteLeadsService } from './mini-website-leads.service';
import { MiniWebsitesService } from './mini-websites.service';

const CONTEXT = { ip: '10.0.0.1', userAgent: 'jest' };

function websites() {
  return new MiniWebsitesService(
    { query: jest.fn(), transaction: jest.fn() } as unknown as DatabaseService,
    {} as unknown as StorageService,
    {} as unknown as PublicPageAnalyticsService,
    {
      assertAllowed: jest.fn().mockResolvedValue(undefined),
    } as unknown as TemplateAccessService,
  );
}

describe('lead form definitions', () => {
  const service = websites();

  it('demotes a CRM mapping its field type cannot honestly hold', () => {
    const form = service.readLeadForm({}, [
      // A dropdown claiming to be an email address would put whichever option
      // was chosen into the column a TikTok audience is hashed from.
      {
        id: 'a',
        label: 'City',
        type: 'select',
        mapping: 'email',
        options: ['Erbil'],
      },
      { id: 'b', label: 'Email', type: 'email', mapping: 'email' },
    ]);

    expect(form.fields[0].mapping).toBe('none');
    expect(form.fields[1].mapping).toBe('email');
  });

  it('gives each CRM mapping to at most one question', () => {
    const form = service.readLeadForm({}, [
      { id: 'a', label: 'Mobile', type: 'phone', mapping: 'phone' },
      { id: 'b', label: 'Landline', type: 'phone', mapping: 'phone' },
    ]);

    expect(form.fields.map((field) => field.mapping)).toEqual([
      'phone',
      'none',
    ]);
  });

  it('keeps choices only for dropdowns, de-duplicated', () => {
    const form = service.readLeadForm({}, [
      {
        id: 'a',
        label: 'City',
        type: 'select',
        options: ['Erbil', 'Erbil', ' Duhok '],
      },
      { id: 'b', label: 'Note', type: 'text', options: ['ignored'] },
    ]);

    expect(form.fields[0].options).toEqual(['Erbil', 'Duhok']);
    expect(form.fields[1].options).toEqual([]);
  });

  it('cannot require consent to a sentence that was never written', () => {
    const form = service.readLeadForm(
      { consentText: '   ', consentRequired: true },
      [],
    );

    expect(form.consentRequired).toBe(false);
  });
});

describe('MiniWebsitesService validation', () => {
  const base = {
    name: 'Test website',
    slug: 'test-website',
    avatar: '/images/DefaultAvatar.png',
    content: { heroBackgroundType: 'color', heroBackgroundColor: '#000000' },
  };

  it('rejects a form with no required way to reply', async () => {
    const service = websites();
    await expect(
      service.create(
        {
          ...base,
          sections: [{ key: 'leadForm', enabled: true }],
          leadForm: {
            fields: [
              {
                id: 'a',
                label: 'Name',
                type: 'text',
                mapping: 'name',
                required: true,
              },
            ],
          },
        },
        'business-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a single-tier pricing table', async () => {
    const service = websites();
    await expect(
      service.create(
        {
          ...base,
          sections: [{ key: 'pricing', enabled: true }],
          // One tier is a price, not a choice; the section exists to compare.
          plans: [{ id: 'a', name: 'Basic', features: ['One'] }],
        },
        'business-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a plan with nothing listed in it', async () => {
    const service = websites();
    await expect(
      service.create(
        {
          ...base,
          sections: [{ key: 'pricing', enabled: true }],
          plans: [
            { id: 'a', name: 'Basic', features: ['One'] },
            { id: 'b', name: 'Pro', features: [] },
          ],
        },
        'business-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a form whose consent line has wording', async () => {
    const service = websites();
    const database = { query: jest.fn(), transaction: jest.fn() };
    Reflect.set(service, 'database', database);
    Reflect.set(service, 'storage', { claimBusinessAssets: jest.fn() });
    database.query.mockResolvedValue({ rows: [] });
    database.transaction.mockRejectedValue(new Error('stop after validation'));

    await expect(
      service.create(
        {
          ...base,
          sections: [{ key: 'leadForm', enabled: true }],
          leadForm: {
            consentText: 'I agree to be contacted.',
            consentRequired: true,
            fields: [
              {
                id: 'a',
                label: 'Phone',
                type: 'phone',
                mapping: 'phone',
                required: true,
              },
            ],
          },
        },
        'business-1',
      ),
      // Validation passed, so the failure comes from the stubbed transaction
      // rather than from a rejected payload.
    ).rejects.toThrow('stop after validation');
  });
});

describe('MiniWebsiteLeadsService', () => {
  const form = {
    title: 'Enquiry',
    description: '',
    submitLabel: '',
    successMessage: 'Thanks.',
    consentText: 'I agree.',
    consentRequired: true,
    fields: [
      {
        id: 'phone',
        label: 'Phone',
        placeholder: '',
        helpText: '',
        type: 'phone',
        mapping: 'phone',
        required: true,
        options: [],
      },
      {
        id: 'city',
        label: 'City',
        placeholder: '',
        helpText: '',
        type: 'select',
        mapping: 'none',
        required: false,
        options: ['Erbil'],
      },
    ],
  };

  function build() {
    const database = { query: jest.fn() };
    // Typed rather than left as `jest.fn()`: the assertions below read the
    // event that was handed to the ingest, and an untyped mock would let a
    // renamed field pass unnoticed.
    const ingest = jest
      .fn<
        Promise<unknown>,
        [Parameters<UnifiedAnalyticsService['ingest']>[0]]
      >()
      .mockResolvedValue({});
    const analytics = { ingest };
    database.query.mockResolvedValue({
      rows: [
        {
          id: 'mini-1',
          business_id: 'business-1',
          lead_form_enabled: true,
          lead_form: form,
          lead_fields: form.fields,
        },
      ],
    });
    const service = new MiniWebsiteLeadsService(
      database as unknown as DatabaseService,
      websites(),
      analytics as unknown as UnifiedAnalyticsService,
    );
    return { service, analytics };
  }

  it('sends the submission through the shared analytics ingest', async () => {
    const { service, analytics } = build();

    const result = await service.submit(
      'acme',
      'page',
      {
        visitorId: 'visitor-0001',
        sessionId: 'session-0001',
        answers: { phone: '0750 248 5829', city: 'Erbil' },
        consent: true,
      },
      CONTEXT,
    );

    expect(result).toEqual({ submitted: true, successMessage: 'Thanks.' });
    const event = analytics.ingest.mock.calls[0][0];
    expect(event.eventName).toBe('form_submit');
    expect(event.pageId).toBe('mini-1');
    expect(event.consentState).toBe('granted');
    // Digits only, so the same person reached twice is one contact.
    expect(event.properties?.phone).toBe('07502485829');
    // Unmapped answers are labelled rather than keyed by an opaque field id.
    expect(event.properties?.answers).toEqual({ City: 'Erbil' });
  });

  it('records nothing when the consent it demanded was not given', async () => {
    const { service, analytics } = build();

    await expect(
      service.submit(
        'acme',
        'page',
        {
          visitorId: 'visitor-0001',
          sessionId: 'session-0001',
          answers: { phone: '07502485829' },
        },
        CONTEXT,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(analytics.ingest).not.toHaveBeenCalled();
  });

  it('answers a filled honeypot exactly like a real submission, and stores nothing', async () => {
    const { service, analytics } = build();

    const result = await service.submit(
      'acme',
      'page',
      {
        visitorId: 'visitor-0001',
        sessionId: 'session-0001',
        answers: { phone: '07502485829' },
        consent: true,
        website: 'http://spam.example',
      },
      CONTEXT,
    );

    expect(result.submitted).toBe(true);
    expect(analytics.ingest).not.toHaveBeenCalled();
  });

  it('rejects an answer that is not one of the offered choices', async () => {
    const { service } = build();

    await expect(
      service.submit(
        'acme',
        'page',
        {
          visitorId: 'visitor-0001',
          sessionId: 'session-0001',
          answers: { phone: '07502485829', city: 'Nowhere' },
          consent: true,
        },
        CONTEXT,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a submission missing a required answer', async () => {
    const { service } = build();

    await expect(
      service.submit(
        'acme',
        'page',
        {
          visitorId: 'visitor-0001',
          sessionId: 'session-0001',
          answers: { city: 'Erbil' },
          consent: true,
        },
        CONTEXT,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
