import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BatchSyncLinksDto, SyncLinksDto } from './links/dto/sync-links.dto';
import { AccessRuleStatusDto } from './platform-admin/dto/access-rule-status.dto';
import { ProfileChangeReviewDto } from './platform-admin/dto/profile-change-review.dto';

describe('request boundary DTOs', () => {
  const strictPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  });

  it('rejects malformed bulk link payloads and oversized batches', async () => {
    const invalid = plainToInstance(SyncLinksDto, {
      links: Array.from({ length: 501 }, () => ({ platform: 1 })),
    });
    await expect(validate(invalid)).resolves.toEqual(
      expect.arrayContaining([expect.any(Object)]),
    );
  });

  it('accepts a valid link synchronization payload', async () => {
    const valid = plainToInstance(SyncLinksDto, {
      links: [{ platform: 'website', url: 'https://example.com' }],
    });
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('validates both compatible batch link formats and delete IDs', async () => {
    const invalid = plainToInstance(BatchSyncLinksDto, {
      createLinks: [{ platform: 'website', url: 'not-a-url' }],
      deleteIds: ['not-a-uuid'],
    });
    await expect(validate(invalid)).resolves.not.toHaveLength(0);

    const valid = plainToInstance(BatchSyncLinksDto, {
      links: [{ platform: 'website', url: 'https://example.com' }],
      deleteIds: ['11111111-1111-4111-8111-111111111111'],
    });
    await expect(validate(valid)).resolves.toHaveLength(0);
  });

  it('restricts status and review actions to their enums', async () => {
    await expect(
      validate(plainToInstance(AccessRuleStatusDto, { status: 'paused' })),
    ).resolves.not.toHaveLength(0);
    await expect(
      validate(plainToInstance(ProfileChangeReviewDto, { action: 'approve' })),
    ).resolves.toHaveLength(0);
  });

  it('rejects unknown DTO fields', async () => {
    await expect(
      strictPipe.transform(
        { status: 'active', unexpected: true },
        { type: 'body', metatype: AccessRuleStatusDto },
      ),
    ).rejects.toThrow('Bad Request Exception');
  });
});
