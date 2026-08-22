import { readFileSync } from 'fs';
import { join } from 'path';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ALLOWED_LINK_URL, LINK_URL_MAX_LENGTH } from './link-url';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

const LINKTREE_ID = '11111111-1111-1111-1111-111111111111';

async function urlErrors(dto: object): Promise<string[]> {
  const errors = await validate(dto as never);
  return errors
    .filter((error) => error.property === 'url')
    .map((e) => e.property);
}

describe('link address rule', () => {
  it.each([
    'https://example.com/page',
    'http://example.com',
    'tel:+9647500000000',
    'mailto:someone@example.com',
    'viber://chat?number=%2B9647500000000',
  ])('accepts %s', (url) => {
    expect(ALLOWED_LINK_URL.test(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'example.com',
    ' https://example.com',
  ])('refuses %s', (url) => {
    expect(ALLOWED_LINK_URL.test(url)).toBe(false);
  });

  /**
   * The database refuses these through `links_url_check`, and nothing maps
   * SQLSTATE 23514 — so an address that only the constraint rejected came back
   * as a 500 rather than a 400 naming the field. Both single-link bodies
   * accepted any string until they shared the sync payload's rule.
   */
  it('rejects an address the database constraint would refuse, on create', async () => {
    await expect(
      urlErrors(
        plainToInstance(CreateLinkDto, {
          linktree_id: LINKTREE_ID,
          platform: 'custom',
          url: 'javascript:alert(1)',
        }),
      ),
    ).resolves.toEqual(['url']);
  });

  it('rejects an address the database constraint would refuse, on update', async () => {
    await expect(
      urlErrors(plainToInstance(UpdateLinkDto, { url: 'javascript:alert(1)' })),
    ).resolves.toEqual(['url']);
  });

  it('accepts a valid address on create', async () => {
    await expect(
      urlErrors(
        plainToInstance(CreateLinkDto, {
          linktree_id: LINKTREE_ID,
          platform: 'custom',
          url: 'https://example.com',
        }),
      ),
    ).resolves.toEqual([]);
  });

  it('bounds the address length on both bodies', async () => {
    const tooLong = `https://example.com/${'a'.repeat(LINK_URL_MAX_LENGTH)}`;

    await expect(
      urlErrors(plainToInstance(UpdateLinkDto, { url: tooLong })),
    ).resolves.toEqual(['url']);
  });

  /** One rule, so the three bodies cannot drift apart again. */
  it('is the only link address regex the DTOs carry', () => {
    const dtos = [
      'create-link.dto.ts',
      'update-link.dto.ts',
      'sync-links.dto.ts',
    ];

    for (const file of dtos) {
      const source = readFileSync(join(__dirname, 'dto', file), 'utf8');
      expect(source).toContain('ALLOWED_LINK_URL');
      expect(source).not.toContain('viber:\\/\\/)/');
    }
  });
});
