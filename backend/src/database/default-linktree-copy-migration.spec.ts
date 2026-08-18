import { readFileSync } from 'fs';
import { join } from 'path';
import {
  LINKTREE_DEFAULT_DESCRIPTION,
  LINKTREE_DEFAULT_WHATSAPP_QUESTIONS,
} from '@linktree/types';

const MIGRATION = readFileSync(
  join(
    __dirname,
    'migrations',
    '2026-08-18_fill_default_linktree_page_copy.sql',
  ),
  'utf8',
);

describe('default linktree copy backfill migration', () => {
  it('declares no transaction of its own, because the runner supplies one', () => {
    expect(MIGRATION).not.toMatch(/^\s*BEGIN;/m);
    expect(MIGRATION).not.toMatch(/^\s*COMMIT;/m);
  });

  it('writes the same helper text the editor and the seeder use', () => {
    expect(MIGRATION).toContain(`SET description = '${LINKTREE_DEFAULT_DESCRIPTION}'`);
  });

  /**
   * A business that wrote its own helper text has reviewed that page. Matching
   * only empty values is what keeps this backfill from overwriting it, and is
   * also what makes a second run a no-op.
   */
  it('touches only default pages whose description is empty', () => {
    expect(MIGRATION).toContain('WHERE is_default = true');
    expect(MIGRATION).toContain("coalesce(btrim(description), '') = ''");
  });

  it('leaves the tagline and the footer credit alone', () => {
    expect(MIGRATION).not.toMatch(/SET\s+subtitle\s*=/);
    expect(MIGRATION).not.toMatch(/SET\s+footer_text\s*=/);
  });

  it('seeds the same starter questions the editor does', () => {
    for (const question of LINKTREE_DEFAULT_WHATSAPP_QUESTIONS) {
      expect(MIGRATION).toContain(`'${question.text}'`);
      expect(MIGRATION).toContain(`'${question.message}'`);
    }
  });

  it('skips pages that already have questions', () => {
    expect(MIGRATION).toContain('INSERT INTO public.whatsapp_questions');
    expect(MIGRATION).toContain('NOT EXISTS');
    expect(MIGRATION).toContain('WHERE q.linktree_id = lt.id');
  });
});
