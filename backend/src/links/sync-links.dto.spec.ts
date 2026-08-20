import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { readBaselineSql } from '../database/baseline';
import { BatchSyncLinksDto } from './dto/sync-links.dto';

/**
 * What the links endpoint will accept from the page editor.
 *
 * Both rules here were broken at once, and both surfaced as the same opaque
 * "Validation failed" toast with no field named:
 *
 * - `url` was `@IsUrl({ protocols: ['http','https'] })`, so every `tel:`,
 *   `mailto:` and `viber://` link the editor generates was rejected — a phone
 *   button could be built and never saved.
 * - `display_order` was absent from the DTO, and `forbidNonWhitelisted` rejects
 *   the whole request over an undeclared property. The dashboard sends it on
 *   every link, so *every* save from that screen failed.
 *
 * The pipe is constructed with the same options as `main.ts`; testing the
 * decorators without it would not exercise the whitelist rule that caused half
 * of this.
 */

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  validationError: { target: false, value: false },
});

function validate(body: Record<string, unknown>) {
  return pipe.transform(body, { type: 'body', metatype: BatchSyncLinksDto });
}

function link(overrides: Record<string, unknown> = {}) {
  return {
    platform: 'whatsapp',
    url: 'https://wa.me/9647502485829',
    ...overrides,
  };
}

describe('BatchSyncLinksDto', () => {
  it('accepts the payload the dashboard actually sends', async () => {
    await expect(
      validate({
        deleteIds: [],
        createLinks: [
          {
            platform: 'whatsapp',
            url: 'https://wa.me/9647502485829',
            display_order: 0,
            display_name: null,
            description: null,
            default_message: null,
            metadata: {},
          },
        ],
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    ['https', 'https://example.com/page'],
    ['http', 'http://example.com/page'],
    ['tel', 'tel:+9647502485829'],
    ['mailto', 'mailto:someone@example.com'],
    ['viber', 'viber://chat?number=+9647502485829'],
  ])('accepts a %s link', async (_label, url) => {
    await expect(
      validate({ createLinks: [link({ url })] }),
    ).resolves.toBeDefined();
  });

  it.each([
    ['a scheme the renderer cannot open', 'ftp://example.com/file'],
    ['a javascript: payload', 'javascript:alert(1)'],
    ['a bare string', 'wa.me/964750'],
  ])('rejects %s', async (_label, url) => {
    await expect(validate({ createLinks: [link({ url })] })).rejects.toThrow();
  });

  it('matches the schemes the database itself allows', () => {
    // `links_url_check` is the real gate. A DTO that accepted more would move
    // the failure from a 400 to a 500 at insert time.
    const schema = readBaselineSql(
      join(__dirname, '..', 'database', 'migrations'),
    );
    expect(schema).toContain(
      "url ~ '^https?://|^tel:|^mailto:|^viber://'::text",
    );
  });

  it('still rejects an undeclared property', async () => {
    // The whitelist is doing real work elsewhere; widening it for
    // `display_order` must not have turned it off.
    await expect(
      validate({ createLinks: [link({ not_a_column: 'x' })] }),
    ).rejects.toThrow();
  });
});
