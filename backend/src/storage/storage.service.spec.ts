import { StorageService } from './storage.service';
import type { StorageDriver } from './storage.driver';
import { DatabaseService } from '../database/database.service';
import sharp from 'sharp';

class MemoryStorageDriver implements StorageDriver {
  readonly objects = new Map<string, Buffer>();

  checkHealth(): Promise<void> {
    return Promise.resolve();
  }

  write(key: string, content: Buffer): Promise<void> {
    this.objects.set(key, content);
    return Promise.resolve();
  }

  read(key: string): Promise<Buffer | null> {
    return Promise.resolve(this.objects.get(key) || null);
  }

  delete(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.delete(key));
  }
}

describe('StorageService', () => {
  let driver: MemoryStorageDriver;
  let service: StorageService;

  beforeEach(() => {
    driver = new MemoryStorageDriver();
    service = new StorageService(driver);
  });

  it('keeps public upload URLs independent from the storage driver', async () => {
    const url = await service.uploadImage(
      Buffer.from('image'),
      'businesses/acme/logo.png',
    );

    expect(url).toBe('/images/upload/businesses/acme/logo.png');
    expect(driver.objects.get('businesses/acme/logo.png')?.toString()).toBe(
      'image',
    );
  });

  it('reads and restores assets through the driver contract', async () => {
    await service.restoreUploadedAsset(
      '/images/upload/businesses/acme/logo.png',
      Buffer.from('restored'),
    );

    await expect(
      service.readUploadedAsset('/images/upload/businesses/acme/logo.png'),
    ).resolves.toEqual(Buffer.from('restored'));
  });

  it('sanitizes traversal segments before they reach a driver', async () => {
    await service.uploadImage(Buffer.from('safe'), '../../outside/logo.png');
    expect(driver.objects.has('outside/logo.png')).toBe(true);
  });

  it('supports the temporary flat legacy fallback during deletion', async () => {
    driver.objects.set('_legacy/flat/logo.png', Buffer.from('legacy'));
    await service.deleteImage('/images/upload/logo.png');
    expect(driver.objects.has('_legacy/flat/logo.png')).toBe(false);
  });

  it('enforces the stored allowed-format policy', async () => {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            max_upload_size_mb: 5,
            allowed_formats: ['png'],
            optimize_images: true,
            image_quality: 82,
            max_image_dimension: 2048,
            auto_cleanup_unused: true,
            unused_grace_hours: 72,
            updated_at: new Date().toISOString(),
          },
        ],
      }),
    } as unknown as DatabaseService;
    const policyService = new StorageService(driver, database);

    await expect(
      policyService.uploadImage(
        Buffer.from([0xff, 0xd8, 0xff]),
        'businesses/acme/logo.jpg',
      ),
    ).rejects.toThrow('JPEG uploads are disabled');
  });

  it('optimizes and inventories new images through the shared service', async () => {
    const source = await sharp({
      create: { width: 1200, height: 800, channels: 4, background: '#b6f20d' },
    })
      .png()
      .toBuffer();
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            max_upload_size_mb: 5,
            allowed_formats: ['png'],
            optimize_images: true,
            image_quality: 80,
            max_image_dimension: 512,
            auto_cleanup_unused: true,
            unused_grace_hours: 72,
            updated_at: new Date().toISOString(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const policyService = new StorageService(driver, {
      query,
    } as unknown as DatabaseService);

    await policyService.uploadImage(source, 'businesses/acme/cover.png');

    const stored = driver.objects.get('businesses/acme/cover.png');
    expect(stored).toBeDefined();
    await expect(sharp(stored).metadata()).resolves.toMatchObject({
      width: 512,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('uploaded_media_assets'),
      expect.any(Array),
    );
  });

  it('claims uploaded branding for its business owner', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const managed = new StorageService(driver, {
      query,
    } as unknown as DatabaseService);

    await managed.claimBusinessAssets('business-id', {
      logo: '/images/upload/pending/logo.png',
      staticLogo: '/images/logo.png',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SET owner_business_id=$1'),
      ['business-id', ['/images/upload/pending/logo.png']],
    );
  });

  it('deletes a replaced upload only after it has no database references', async () => {
    driver.objects.set('businesses/acme/old.png', Buffer.from('old'));
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ referenced: false }] })
      .mockResolvedValueOnce({ rows: [] });
    const managed = new StorageService(driver, {
      query,
    } as unknown as DatabaseService);

    await expect(
      managed.deleteUnreferencedFromValues(
        '/images/upload/businesses/acme/old.png',
      ),
    ).resolves.toBe(1);
    expect(driver.objects.has('businesses/acme/old.png')).toBe(false);
  });
});
