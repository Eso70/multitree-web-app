/**
 * A `mini_websites` row joined with the aggregate JSON columns built by
 * `CONTENT_SELECT` and the branding/analytics columns added by each query.
 *
 * The section collections stay `unknown` because they come back as raw
 * `json_agg` output; every one of them is run through its own `normalize*`
 * guard before use. Declared as a type alias rather than an interface so it
 * satisfies pg's `QueryResultRow` constraint.
 */
export type WebsiteRow = {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  avatar: string | null;
  cover: string | null;
  template_key: string;
  variation: string;
  background_style: unknown;
  profession_template: string | null;
  accent_color: string | null;
  status: string;
  primary_action: string | null;
  whatsapp_number: string | null;
  pixel_event: string | null;
  event_value: number | string | null;
  hero_background_type: string | null;
  hero_background_color: string | null;
  hero_video_url: string | null;
  current_version: number | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;

  // Joined branding columns.
  business_default_avatar?: string | null;
  business_website_color?: string | null;

  // Aggregated analytics columns.
  views?: string | number | null;
  actions?: string | number | null;
  conversions?: string | number | null;

  // Raw json_agg output, narrowed by the normalize* helpers.
  sections?: unknown;
  social_links?: unknown;
  locations?: unknown;
  location?: unknown;
  hours?: unknown;
  gallery?: unknown;
  faq?: unknown;
  services?: unknown;
  bookings?: unknown;
  team?: unknown;
  certificates?: unknown;
  videos?: unknown;
  youtube_videos?: unknown;
  stories?: unknown;
  partners?: unknown;
  reviews?: unknown;
  before_after?: unknown;
  coverage?: unknown;
  payment_methods?: unknown;
  special_offers?: unknown;
  events?: unknown;
  audio?: unknown;
  advantages?: unknown;
  impact_stats?: unknown;
  process_steps?: unknown;
  documents?: unknown;
  owned_properties?: unknown;
  education?: unknown;
  experience?: unknown;
  lead_form?: unknown;
  lead_fields?: unknown;
  plans?: unknown;
};

export const CONTENT_SELECT = `
  (SELECT COALESCE(json_agg(json_build_object(
            'key', section.section_key,
            'enabled', section.enabled) ORDER BY section.position), '[]'::json)
     FROM mini_website_sections section
    WHERE section.mini_website_id = website.id) AS sections,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', link.link_key,
            'platform', link.platform,
            'url', link.url,
            'value', link.value,
            'countryCode', link.country_code,
            'displayName', link.display_name,
            'customColor', link.custom_color,
            'customIcon', link.custom_icon,
            'enabled', link.enabled,
            'order', link.position) ORDER BY link.position), '[]'::json)
     FROM mini_website_social_links link
    WHERE link.mini_website_id = website.id) AS social_links,
  (SELECT COALESCE(json_agg(json_build_object(
            'name', place.name,
            'phone', place.phone,
            'phoneCountryCode', place.phone_country_code,
            'address', place.address,
            'area', place.area,
            'city', place.city,
            'lat', place.lat,
            'lng', place.lng,
            'precision', place.precision,
            'radiusMeters', place.radius_meters,
            'zoom', place.zoom,
            'mapUrl', place.map_url,
            'image', place.image
          ) ORDER BY place.position), '[]'::json)
     FROM mini_website_locations place
    WHERE place.mini_website_id = website.id) AS locations,
  (SELECT COALESCE(json_agg(json_build_object(
            'day', hour.day,
            'closed', hour.closed,
            'open', to_char(hour.open_time, 'HH24:MI'),
            'close', to_char(hour.close_time, 'HH24:MI')) ORDER BY hour.day), '[]'::json)
     FROM mini_website_hours hour
    WHERE hour.mini_website_id = website.id) AS hours,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'image', item.image,
            'caption', item.title) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'gallery') AS gallery,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'question', item.title,
            'answer', item.subtitle) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'faq') AS faq,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'price', item.price,
            'image', item.image,
            'actionLabel', item.action_label,
            'actionType', item.action_type,
            'actionValue', item.action_value,
            'actionCountryCode', item.action_country_code,
            'url', item.url,
            'pixelEvent', item.pixel_event) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
     AND item.section_key = 'services') AS services,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'durationMinutes', item.duration_minutes,
            'price', item.price,
            'provider', item.provider,
            'actionLabel', item.action_label,
            'actionValue', item.action_value,
            'actionCountryCode', item.action_country_code,
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'booking') AS bookings,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'name', item.title,
            'role', item.role,
            'experience', item.experience,
            'bio', item.subtitle,
            'image', item.image,
            'actionLabel', item.action_label,
            'actionType', item.action_type,
            'actionValue', item.action_value,
            'actionCountryCode', item.action_country_code,
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'team') AS team,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'issuer', item.issuer,
            'year', item.year_label,
            'description', item.subtitle,
            'image', item.image,
            'verificationUrl', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'credentials') AS certificates,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'platform', item.media_platform,
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'shortVideos') AS videos,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'platform', 'youtube',
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'youtubeVideos') AS youtube_videos,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'platform', item.media_platform,
            'mediaType', item.status_label,
            'image', item.image,
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'stories') AS stories,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'name', item.title,
            'image', item.image,
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'partners') AS partners,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'author', item.title,
            'text', item.subtitle,
            'image', item.image,
            'rating', item.rating) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'reviews') AS reviews,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'beforeImage', item.image,
            'afterImage', item.secondary_image,
            'beforeLabel', item.role,
            'afterLabel', item.experience) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'beforeAfter') AS before_after,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'kind', item.role,
            'name', item.title,
            'detail', item.subtitle) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'serviceAreas') AS coverage,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'provider', item.role,
            'name', item.title,
            'accountName', item.issuer,
            'accountNumber', item.experience,
            'instructions', item.subtitle,
            'image', item.image) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'payments') AS payment_methods,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'originalPrice', item.experience,
            'offerPrice', item.price,
            'couponCode', item.issuer,
            'expiresAt', item.year_label,
            'image', item.image,
            'url', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'offers') AS special_offers,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'startsAt', item.year_label,
            'location', item.role,
            'image', item.image,
            'registrationUrl', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'events') AS events,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'platform', item.role,
            'url', item.url,
            'image', item.image) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'audio') AS audio,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'icon', item.role) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'whyChooseUs') AS advantages,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'value', item.price,
            'label', item.title,
            'suffix', item.action_label,
            'icon', item.role) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'impactStats') AS impact_stats,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'icon', item.role,
            'actionLabel', item.action_label,
            'actionUrl', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'process') AS process_steps,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'description', item.subtitle,
            'fileUrl', item.url,
            'fileType', item.role,
            'fileSize', item.experience) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'documents') AS documents,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'name', item.title,
            'relationship', item.role,
            'propertyType', item.issuer,
            'description', item.subtitle,
            'image', item.image,
            'url', item.url,
            'featuredUrl', item.experience,
            'foundedYear', item.year_label) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'ownedProperties') AS owned_properties,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'institution', item.title,
            'degree', item.role,
            'fieldOfStudy', item.experience,
            'location', item.issuer,
            'startYear', item.price,
            'endYear', item.year_label,
            'status', item.status_label,
            'grade', item.action_label,
            'description', item.subtitle,
            'image', item.image,
            'verificationUrl', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'education') AS education,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'title', item.title,
            'organization', item.role,
            'employmentType', item.experience,
            'location', item.issuer,
            'startDate', item.price,
            'endDate', item.year_label,
            'status', item.status_label,
            'description', item.subtitle,
            'image', item.image,
            'verificationUrl', item.url) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'experience') AS experience,
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
      AND item.section_key = 'leadForm') AS lead_fields,
  (SELECT COALESCE(json_agg(json_build_object(
            'id', item.item_key,
            'name', item.title,
            'description', item.subtitle,
            'price', item.price,
            'period', item.experience,
            'featured', item.featured,
            'features', item.options,
            'actionLabel', item.action_label,
            'actionType', item.action_type,
            'actionValue', item.action_value,
            'actionCountryCode', item.action_country_code,
            'url', item.url,
            'pixelEvent', item.pixel_event) ORDER BY item.position), '[]'::json)
     FROM mini_website_items item
    WHERE item.mini_website_id = website.id
      AND item.section_key = 'pricing') AS plans
`;
