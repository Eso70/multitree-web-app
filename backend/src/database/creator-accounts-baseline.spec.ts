import { readBaselineSql } from './baseline';
import { join } from 'path';

describe('Creator account baseline', () => {
  const sql = readBaselineSql(join(__dirname, 'migrations'));

  it('creates isolated accounts, Google trial claims, and root slug locks', () => {
    expect(sql).toContain('CREATE TABLE public.creator_accounts');
    expect(sql).toContain('CREATE TABLE public.creator_trial_claims');
    expect(sql).toContain('CREATE TABLE public.root_public_slugs');
    expect(sql).toContain('PRIMARY KEY (page_type, slug)');
    expect(sql).toContain('page_reservation_token uuid');
    expect(sql).toContain('google_subject_hmac character(64)');
    expect(sql).toContain('creator_trial_claims_device_hmac_idx');
    expect(sql).toContain(
      "account_type)::text = ANY (ARRAY[('business'::character varying)::text, ('platform'::character varying)::text, ('creator'::character varying)::text]",
    );
  });

  it('registers explicit platform permissions', () => {
    expect(sql).toContain("'platform:creators:read'");
    expect(sql).toContain("'platform:creators:manage'");
  });
});
