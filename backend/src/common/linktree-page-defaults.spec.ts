import {
  LINKTREE_DEFAULT_DESCRIPTION,
  LINKTREE_DEFAULT_FOOTER_PHONE,
  LINKTREE_DEFAULT_FOOTER_TEXT,
  LINKTREE_DEFAULT_SUBTITLE,
  LINKTREE_DEFAULT_WHATSAPP_MODAL_SUBTITLE,
  LINKTREE_DEFAULT_WHATSAPP_MODAL_TITLE,
  LINKTREE_DEFAULT_WHATSAPP_QUESTIONS,
} from '@linktree/types';
import {
  DEFAULT_LINKTREE_DESCRIPTION,
  DEFAULT_LINKTREE_FOOTER_PHONE,
  DEFAULT_LINKTREE_FOOTER_TEXT,
  DEFAULT_LINKTREE_SUBTITLE,
  DEFAULT_LINKTREE_WHATSAPP_MODAL_SUBTITLE,
  DEFAULT_LINKTREE_WHATSAPP_MODAL_TITLE,
  DEFAULT_LINKTREE_WHATSAPP_QUESTIONS,
} from './linktree-defaults';

/**
 * `linktree-defaults.ts` copies these values instead of importing them, because
 * `@linktree/types` is source-only and Node cannot resolve its extensionless
 * re-exports as ESM at runtime. ts-jest compiles to CommonJS, so the shared
 * values import cleanly here and the duplication can be checked rather than
 * trusted.
 *
 * A drift here means `POST /linktrees/default` seeds a page the link editor
 * would have filled differently.
 */
describe('linktree page defaults mirrored from @linktree/types', () => {
  it('seeds the same tagline and helper text as the editor', () => {
    expect(DEFAULT_LINKTREE_SUBTITLE).toBe(LINKTREE_DEFAULT_SUBTITLE);
    expect(DEFAULT_LINKTREE_DESCRIPTION).toBe(LINKTREE_DEFAULT_DESCRIPTION);
  });

  it('seeds the same footer credit as the editor', () => {
    expect(DEFAULT_LINKTREE_FOOTER_TEXT).toBe(LINKTREE_DEFAULT_FOOTER_TEXT);
    expect(DEFAULT_LINKTREE_FOOTER_PHONE).toBe(LINKTREE_DEFAULT_FOOTER_PHONE);
  });

  it('seeds the same WhatsApp modal wording as the editor', () => {
    expect(DEFAULT_LINKTREE_WHATSAPP_MODAL_TITLE).toBe(
      LINKTREE_DEFAULT_WHATSAPP_MODAL_TITLE,
    );
    expect(DEFAULT_LINKTREE_WHATSAPP_MODAL_SUBTITLE).toBe(
      LINKTREE_DEFAULT_WHATSAPP_MODAL_SUBTITLE,
    );
  });

  it('seeds the same starter questions, in the same order', () => {
    expect(DEFAULT_LINKTREE_WHATSAPP_QUESTIONS).toEqual(
      LINKTREE_DEFAULT_WHATSAPP_QUESTIONS.map((question) => ({ ...question })),
    );
  });
});
