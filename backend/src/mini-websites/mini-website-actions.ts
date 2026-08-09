import type {
  MiniWebsiteActionType,
  MiniWebsiteItemPixelEvent,
} from '@linktree/types';

/**
 * Every clickable thing on a mini website, described the way analytics stores it.
 *
 * A linktree gets these for free: one link is one row, and a database trigger
 * keeps `public_page_actions` in step. A mini website has no such one-to-one
 * shape — a single page carries social links, offers, appointments, plans,
 * documents and a form, each with its own destination — so the set is built
 * here from the saved content and written in the same transaction.
 *
 * Without them every click on a mini website reports no action id, which is why
 * the per-button breakdown was empty while the page totals looked fine.
 */
export interface MiniWebsiteAction {
  /** Matches the `data-mini-action` the renderer puts on the anchor. */
  actionKey: string;
  actionType: string;
  label: string;
  destination: string | null;
  tiktokEvent: string;
  displayOrder: number;
  metadata: Record<string, string>;
}

/** The action types `public_page_actions` accepts. */
const ACTION_TYPE_BY_SECTION: Record<string, string> = {
  social: 'social',
  service: 'service',
  booking: 'booking',
  plan: 'checkout',
  offer: 'checkout',
  event: 'form',
  document: 'download',
  audio: 'link',
  team: 'contact',
  property: 'link',
  partner: 'link',
  video: 'link',
  story: 'link',
  credential: 'link',
  process: 'link',
  location: 'link',
  leadForm: 'form',
};

/**
 * `contact` is not one of the accepted types, so anything conceptually a
 * contact is stored as the channel it actually opens.
 */
function actionTypeFor(kind: string, actionType?: MiniWebsiteActionType) {
  if (actionType === 'whatsapp') return 'whatsapp';
  if (actionType === 'phone') return 'call';
  const mapped = ACTION_TYPE_BY_SECTION[kind] ?? 'link';
  return mapped === 'contact' ? 'link' : mapped;
}

/**
 * Maps an item's pixel event onto the column's allow-list.
 *
 * Takes a plain string because the two callers disagree on how precisely it is
 * typed — the service has the union, the seed has whatever its snapshot holds —
 * and anything unrecognised falls back rather than being trusted.
 */
function tiktokEventFor(pixelEvent?: string) {
  switch (pixelEvent) {
    case 'Contact':
      return 'Contact';
    case 'Lead':
      return 'Lead';
    case 'InitiateCheckout':
      return 'InitiateCheckout';
    case 'CompletePayment':
      return 'CompletePayment';
    default:
      return 'ClickButton';
  }
}

/**
 * The brand a destination belongs to.
 *
 * Recorded at save time rather than guessed later from the row's label. A
 * label is whatever the business typed — a video called "our new link" is not
 * a LinkedIn video — so a reader that guesses will eventually be wrong, and
 * silently.
 */
export function brandForDestination(destination: string): string | null {
  const value = destination.toLowerCase();
  if (/(?:^|\/\/|\.)(?:wa\.me|whatsapp\.com)/.test(value)) return 'whatsapp';
  if (value.includes('youtube.com') || value.includes('youtu.be'))
    return 'youtube';
  if (value.includes('tiktok.com')) return 'tiktok';
  if (value.includes('instagram.com')) return 'instagram';
  if (value.includes('facebook.com') || value.includes('fb.com'))
    return 'facebook';
  if (value.includes('t.me') || value.includes('telegram.')) return 'telegram';
  if (value.includes('linkedin.com')) return 'linkedin';
  if (value.includes('snapchat.com')) return 'snapchat';
  if (value.includes('discord.')) return 'discord';
  if (value.includes('viber')) return 'viber';
  if (value.includes('twitter.com') || value.includes('x.com')) return 'x';
  if (value.includes('google.com/maps') || value.includes('maps.app.goo.gl'))
    return 'gps';
  if (value.startsWith('tel:')) return 'phone';
  if (value.startsWith('mailto:')) return 'email';
  return null;
}

/** The page-level keys the renderer falls back to when no row declares one. */
export const MINI_WEBSITE_PAGE_ACTIONS: ReadonlyArray<{
  key: string;
  type: string;
  label: string;
  tiktokEvent: string;
}> = [
  {
    key: 'mini:whatsapp',
    type: 'whatsapp',
    label: 'واتساپ',
    tiktokEvent: 'Contact',
  },
  {
    key: 'mini:phone',
    type: 'call',
    label: 'پەیوەندی تەلەفۆنی',
    tiktokEvent: 'Contact',
  },
  { key: 'mini:email', type: 'email', label: 'ئیمەیل', tiktokEvent: 'Contact' },
  {
    key: 'mini:map',
    type: 'link',
    label: 'نەخشە و ڕێنمایی',
    tiktokEvent: 'ClickButton',
  },
  {
    key: 'mini:share',
    type: 'custom',
    label: 'هاوبەشکردن',
    tiktokEvent: 'ClickButton',
  },
  {
    key: 'mini:vcard',
    type: 'download',
    label: 'داگرتنی کارتی پەیوەندی',
    tiktokEvent: 'Download',
  },
  {
    key: 'mini:external',
    type: 'link',
    label: 'لینکی دەرەکی',
    // Overridden by the page's own setting; see `buildMiniWebsiteActions`.
    tiktokEvent: 'ClickButton',
  },
];

interface ContentLike {
  /** The page's default TikTok event, chosen in the editor. */
  pixelEvent?: string | null;
  socialLinks: Array<{
    id: string;
    platform: string;
    url: string;
    displayName: string;
  }>;
  services: Array<{
    id: string;
    title: string;
    url: string;
    actionType: MiniWebsiteActionType;
    pixelEvent: MiniWebsiteItemPixelEvent;
  }>;
  bookings: Array<{ id: string; title: string; url: string }>;
  plans: Array<{
    id: string;
    name: string;
    url: string;
    actionType: MiniWebsiteActionType;
    pixelEvent: MiniWebsiteItemPixelEvent;
  }>;
  specialOffers: Array<{ id: string; title: string; url: string }>;
  events: Array<{ id: string; title: string; registrationUrl: string }>;
  documents: Array<{ id: string; title: string; fileUrl: string }>;
  audio: Array<{ id: string; title: string; url: string }>;
  team: Array<{
    id: string;
    name: string;
    url: string;
    actionType: MiniWebsiteActionType;
  }>;
  ownedProperties: Array<{ id: string; name: string; url: string }>;
  partners: Array<{ id: string; name: string; url: string }>;
  videos: Array<{ id: string; title: string; url: string }>;
  youtubeVideos: Array<{ id: string; title: string; url: string }>;
  stories: Array<{ id: string; title: string; url: string }>;
  certificates: Array<{ id: string; title: string; verificationUrl: string }>;
  processSteps: Array<{ id: string; title: string; actionUrl: string }>;
  locations: Array<{ name: string; city: string; mapUrl: string }>;
  leadForm: { title: string; fields: Array<unknown> };
  sections: Array<{ key: string; enabled: boolean }>;
}

/**
 * Builds the action set for a saved page.
 *
 * Only rows that actually go somewhere are registered — a card with no button
 * cannot be clicked, so an action row for it would report a permanent zero and
 * pad the breakdown with noise. Sections that are switched off are skipped for
 * the same reason.
 */
export function buildMiniWebsiteActions(
  content: ContentLike,
): MiniWebsiteAction[] {
  const on = new Set(
    content.sections
      .filter((section) => section.enabled)
      .map((section) => section.key),
  );
  const actions: MiniWebsiteAction[] = [];
  const add = (
    kind: string,
    id: string,
    label: string,
    destination: string,
    options: {
      actionType?: MiniWebsiteActionType;
      pixelEvent?: string;
      section?: string;
      /** The brand, when the content already names it. */
      platform?: string;
    } = {},
  ) => {
    if (!destination) return;
    const brand = options.platform || brandForDestination(destination);
    actions.push({
      actionKey: `mini:${kind}:${id}`,
      actionType: actionTypeFor(kind, options.actionType),
      label: label.slice(0, 255) || kind,
      destination: destination.slice(0, 2048),
      tiktokEvent: tiktokEventFor(options.pixelEvent),
      displayOrder: actions.length,
      metadata: {
        section: options.section ?? kind,
        kind,
        ...(brand ? { platform: brand } : {}),
      },
    });
  };

  if (on.has('socials'))
    for (const link of content.socialLinks)
      add('social', link.id, link.displayName || link.platform, link.url, {
        pixelEvent: 'Contact',
        section: 'socials',
        // Named by the business when they picked the platform, so it never has
        // to be inferred from a display name they were free to type.
        platform: link.platform,
      });
  if (on.has('services'))
    for (const service of content.services)
      add('service', service.id, service.title, service.url, {
        actionType: service.actionType,
        pixelEvent: service.pixelEvent,
      });
  if (on.has('booking'))
    for (const booking of content.bookings)
      add('booking', booking.id, booking.title, booking.url, {
        pixelEvent: 'Lead',
      });
  if (on.has('pricing'))
    for (const plan of content.plans)
      add('plan', plan.id, plan.name, plan.url, {
        actionType: plan.actionType,
        pixelEvent: plan.pixelEvent,
      });
  if (on.has('offers'))
    for (const offer of content.specialOffers)
      add('offer', offer.id, offer.title, offer.url, {
        pixelEvent: 'InitiateCheckout',
      });
  if (on.has('events'))
    for (const event of content.events)
      add('event', event.id, event.title, event.registrationUrl, {
        pixelEvent: 'Lead',
      });
  if (on.has('documents'))
    for (const document of content.documents)
      add('document', document.id, document.title, document.fileUrl);
  if (on.has('audio'))
    for (const audio of content.audio)
      add('audio', audio.id, audio.title, audio.url);
  if (on.has('team'))
    for (const member of content.team)
      add('team', member.id, member.name, member.url, {
        actionType: member.actionType,
        pixelEvent: 'Contact',
      });
  if (on.has('ownedProperties'))
    for (const property of content.ownedProperties)
      add('property', property.id, property.name, property.url);
  if (on.has('partners'))
    for (const partner of content.partners)
      add('partner', partner.id, partner.name, partner.url);
  if (on.has('shortVideos'))
    for (const video of content.videos)
      add('video', video.id, video.title, video.url);
  if (on.has('youtubeVideos'))
    for (const video of content.youtubeVideos)
      add('video', video.id, video.title, video.url);
  // Stories are often image-only, with no destination of its own — the same
  // reason `leadForm` below is pushed directly rather than through `add`,
  // which skips anything without one. A story is still worth its own row:
  // it is what lets each one report its own view count instead of all of
  // them reporting as one generic external click.
  if (on.has('stories'))
    for (const story of content.stories) {
      const destination = story.url ? story.url.slice(0, 2048) : null;
      const brand = destination ? brandForDestination(destination) : null;
      actions.push({
        actionKey: `mini:story:${story.id}`,
        actionType: actionTypeFor('story'),
        label: (story.title || 'ستۆری').slice(0, 255),
        destination,
        tiktokEvent: tiktokEventFor(undefined),
        displayOrder: actions.length,
        metadata: {
          section: 'stories',
          kind: 'story',
          ...(brand ? { platform: brand } : {}),
        },
      });
    }
  if (on.has('credentials'))
    for (const certificate of content.certificates)
      add(
        'credential',
        certificate.id,
        certificate.title,
        certificate.verificationUrl,
      );
  if (on.has('process'))
    for (const step of content.processSteps)
      add('process', step.id, step.title, step.actionUrl);
  if (on.has('location'))
    content.locations.forEach((location, index) => {
      add(
        'location',
        String(index),
        location.name || location.city || 'شوێن',
        location.mapUrl,
      );
    });

  // The form has no destination of its own — it posts back to us — so it is
  // registered explicitly rather than through `add`, which skips empty links.
  if (on.has('leadForm') && content.leadForm.fields.length)
    actions.push({
      actionKey: 'mini:leadForm',
      actionType: 'form',
      label: content.leadForm.title || 'فۆرمی داواکاری',
      destination: null,
      tiktokEvent: 'Lead',
      displayOrder: actions.length,
      metadata: { section: 'leadForm', kind: 'leadForm' },
    });

  for (const page of MINI_WEBSITE_PAGE_ACTIONS)
    actions.push({
      actionKey: page.key,
      actionType: page.type,
      label: page.label,
      destination: null,
      // The page's own setting applies to the catch-all outbound link and
      // nothing else. That is exactly the reach it had when the renderer
      // carried it: every other page action names an intent the business did
      // not choose — a phone tap is `Contact` whatever the dropdown says —
      // and only an unclassified link has no better answer than the default.
      tiktokEvent:
        page.key === 'mini:external'
          ? tiktokEventFor(content.pixelEvent ?? undefined)
          : page.tiktokEvent,
      displayOrder: actions.length,
      metadata: { section: 'page', kind: page.key.split(':')[1] || 'page' },
    });

  return actions;
}
