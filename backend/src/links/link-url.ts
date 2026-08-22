/**
 * The address schemes a link may use.
 *
 * Mirrors the `links_url_check` constraint in the schema exactly. It used to be
 * `@IsUrl({ protocols: ['http', 'https'] })`, which rejected every `tel:`,
 * `mailto:` and `viber://` link — the three the link editor generates for the
 * phone, email and Viber platforms. Saving a page that contained one failed
 * with a bare "Validation failed", so a phone button could be built in the
 * editor and never stored.
 *
 * Shared by every DTO that accepts a link address. The sync payload mirrored
 * the constraint while the single-link create and update bodies accepted any
 * string, so an address the database refuses — `javascript:` among them —
 * passed validation and failed at the constraint instead. Nothing maps SQLSTATE
 * 23514, so that surfaced as a 500 rather than a 400 naming the field.
 */
export const ALLOWED_LINK_URL = /^(https?:\/\/|tel:|mailto:|viber:\/\/)/;

export const LINK_URL_MESSAGE =
  'url must start with http://, https://, tel:, mailto: or viber://';

/** Matches the column width the schema gives `links.url`. */
export const LINK_URL_MAX_LENGTH = 2048;
