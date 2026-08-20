import { join } from 'path';
import { readBaselineSql } from './baseline';

/**
 * Secrets in the schema are stored one way, in one place.
 *
 * A `business_tiktok` table used to sit beside `business_tiktok_pixels`,
 * written by five call sites and read by two. It held the same Events API
 * token in a plain `text` column and again inside a `configs` jsonb blob,
 * while the table beside it encrypted the very same value. So the platform
 * kept an encrypted copy of a secret and a readable copy of it, and a reader
 * picked whichever it happened to query.
 *
 * These assertions are cheap and the failure they guard against is expensive:
 * a mirror table is the kind of thing that gets reintroduced by someone
 * denormalising "just for the admin list".
 */

const SCHEMA = readBaselineSql(join(__dirname, 'migrations'));

describe('TikTok credential storage', () => {
  it('has exactly one table holding a business pixel', () => {
    const tables = SCHEMA.match(/CREATE TABLE public\.business_tiktok\w*/g);

    expect(tables).toEqual(['CREATE TABLE public.business_tiktok_pixels']);
  });

  it('stores the Events API token only as encrypted bytes', () => {
    const table = SCHEMA.match(
      /CREATE TABLE public\.business_tiktok_pixels \(([\s\S]*?)\n\);/,
    )?.[1];

    expect(table).toContain('encrypted_events_token bytea');
    // Only the last four digits are kept readable, so an operator can tell a
    // configured token from a missing one without the token being recoverable.
    expect(table).toContain('token_last_four character varying(4)');
    expect(table).not.toMatch(/\bevents_token text\b/);
  });
});
