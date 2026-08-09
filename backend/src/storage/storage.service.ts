import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import sharp from 'sharp';
import { DatabaseService } from '../database/database.service';
import { STORAGE_DRIVER, type StorageDriver } from './storage.driver';

const UPLOAD_URL_PREFIX = '/images/upload/';
const MEDIA_FORMATS = ['jpeg', 'png', 'ico'] as const;
// Existing external storage keys may use the namespace that preceded
// `multitree`. New writes always use `multitree/`.
const LEGACY_MULTITREE_STORAGE_PREFIX = 'system/';
type MediaFormat = (typeof MEDIA_FORMATS)[number];

export type MediaPolicy = {
  max_upload_size_mb: number;
  allowed_formats: MediaFormat[];
  optimize_images: boolean;
  image_quality: number;
  max_image_dimension: number;
  auto_cleanup_unused: boolean;
  unused_grace_hours: number;
  updated_at: string;
};

const DEFAULT_POLICY: MediaPolicy = {
  max_upload_size_mb: 5,
  allowed_formats: [...MEDIA_FORMATS],
  optimize_images: true,
  image_quality: 82,
  max_image_dimension: 2048,
  auto_cleanup_unused: true,
  unused_grace_hours: 72,
  updated_at: new Date(0).toISOString(),
};

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private policyCache?: { value: MediaPolicy; expiresAt: number };
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupRunning = false;
  private reconcilePromise?: Promise<void>;

  constructor(
    @Inject(STORAGE_DRIVER) private readonly storageDriver: StorageDriver,
    @Optional() private readonly database?: DatabaseService,
  ) {}

  onModuleInit(): void {
    if (!this.database) return;
    this.reconcilePromise = this.reconcileExistingAssets();
    this.cleanupTimer = setInterval(
      () => void this.cleanupUnusedAssets(false),
      6 * 60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  checkHealth(): Promise<void> {
    return this.storageDriver.checkHealth();
  }

  async uploadImage(fileBuffer: Buffer, path: string): Promise<string> {
    const key = this.sanitizeKey(path);
    if (!this.database) {
      await this.storageDriver.write(key, fileBuffer);
      return `${UPLOAD_URL_PREFIX}${key}`;
    }
    const policy = await this.getPolicy();
    const format = this.formatFromKey(key);
    this.validatePolicy(fileBuffer, format, policy);

    const processed = await this.processImage(fileBuffer, format, policy);
    await this.storageDriver.write(key, processed.buffer);
    const url = `${UPLOAD_URL_PREFIX}${key}`;
    await this.recordAsset({
      key,
      url,
      format,
      originalSize: fileBuffer.length,
      storedSize: processed.buffer.length,
      width: processed.width,
      height: processed.height,
    });
    return url;
  }

  async getMediaStatus() {
    await this.reconcilePromise;
    const policy = await this.getPolicy(true);
    if (!this.database) {
      return {
        policy,
        stats: { asset_count: 0, stored_bytes: 0, saved_bytes: 0 },
        unused_assets: 0,
      };
    }
    const [stats, unused] = await Promise.all([
      this.database.query<{
        asset_count: string;
        stored_bytes: string;
        saved_bytes: string;
      }>(
        `SELECT count(*)::text asset_count,
                coalesce(sum(stored_byte_size),0)::text stored_bytes,
                greatest(coalesce(sum(original_byte_size-stored_byte_size),0),0)::text saved_bytes
         FROM uploaded_media_assets`,
      ),
      this.database.query<{ total: string }>(
        `SELECT count(*)::text total FROM uploaded_media_assets asset
         WHERE asset.created_at < now() - ($1::int * interval '1 hour')
           AND ${this.unreferencedSql('asset')}`,
        [policy.unused_grace_hours],
      ),
    ]);
    return {
      policy,
      stats: {
        asset_count: Number(stats.rows[0]?.asset_count || 0),
        stored_bytes: Number(stats.rows[0]?.stored_bytes || 0),
        saved_bytes: Number(stats.rows[0]?.saved_bytes || 0),
      },
      unused_assets: Number(unused.rows[0]?.total || 0),
    };
  }

  private async reconcileExistingAssets(): Promise<void> {
    if (!this.database || !this.storageDriver.list) return;
    try {
      const files = await this.storageDriver.list();
      const supported = files.flatMap((file) => {
        try {
          const format = this.formatFromKey(file.key);
          const ownerMatch = file.key.match(/^businesses\/([0-9a-f-]{36})\//i);
          return [
            {
              storage_key: file.key,
              public_url: `${UPLOAD_URL_PREFIX}${file.key}`,
              scope:
                file.key.startsWith('multitree/') ||
                file.key.startsWith(LEGACY_MULTITREE_STORAGE_PREFIX)
                  ? 'multitree'
                  : file.key.startsWith('businesses/')
                    ? 'business'
                    : 'other',
              owner_business_id: ownerMatch?.[1] || null,
              format,
              byte_size: file.size,
            },
          ];
        } catch {
          return [];
        }
      });
      for (let offset = 0; offset < supported.length; offset += 500) {
        await this.database.query(
          `INSERT INTO uploaded_media_assets
             (storage_key,public_url,scope,owner_business_id,format,original_byte_size,stored_byte_size)
           SELECT item.storage_key,item.public_url,item.scope,business.id,item.format,item.byte_size,item.byte_size
           FROM jsonb_to_recordset($1::jsonb) AS item(
             storage_key text,public_url text,scope varchar,owner_business_id uuid,format varchar,byte_size bigint)
           LEFT JOIN businesses business ON business.id=item.owner_business_id
           ON CONFLICT(storage_key) DO NOTHING`,
          [JSON.stringify(supported.slice(offset, offset + 500))],
        );
      }
    } catch (error) {
      this.logger.warn(
        `Unable to reconcile existing media: ${(error as Error).message}`,
      );
    }
  }

  async updateMediaPolicy(
    adminId: string,
    policy: Omit<MediaPolicy, 'updated_at'>,
  ): Promise<MediaPolicy> {
    if (!this.database) throw new Error('Database is unavailable');
    const result = await this.database.query<MediaPolicy>(
      `UPDATE platform_media_settings SET
         max_upload_size_mb=$1, allowed_formats=$2::text[], optimize_images=$3,
         image_quality=$4, max_image_dimension=$5, auto_cleanup_unused=$6,
         unused_grace_hours=$7, updated_by=$8, updated_at=now()
       WHERE id=1
       RETURNING max_upload_size_mb,allowed_formats,optimize_images,image_quality,
         max_image_dimension,auto_cleanup_unused,unused_grace_hours,updated_at`,
      [
        policy.max_upload_size_mb,
        policy.allowed_formats,
        policy.optimize_images,
        policy.image_quality,
        policy.max_image_dimension,
        policy.auto_cleanup_unused,
        policy.unused_grace_hours,
        adminId,
      ],
    );
    this.policyCache = undefined;
    return result.rows[0];
  }

  async cleanupUnusedAssets(
    force: boolean,
  ): Promise<{ deleted: number; bytes_freed: number }> {
    if (!this.database || this.cleanupRunning)
      return { deleted: 0, bytes_freed: 0 };
    const policy = await this.getPolicy();
    if (!force && !policy.auto_cleanup_unused)
      return { deleted: 0, bytes_freed: 0 };
    this.cleanupRunning = true;
    let deleted = 0;
    let bytesFreed = 0;
    try {
      for (;;) {
        const candidates = await this.database.query<{
          id: string;
          storage_key: string;
          stored_byte_size: string;
        }>(
          `SELECT asset.id,asset.storage_key,asset.stored_byte_size::text
           FROM uploaded_media_assets asset
           WHERE asset.created_at < now() - ($1::int * interval '1 hour')
             AND ${this.unreferencedSql('asset')}
           ORDER BY asset.created_at LIMIT 250`,
          [policy.unused_grace_hours],
        );
        if (!candidates.rows.length) break;
        for (const asset of candidates.rows) {
          const removed = await this.storageDriver.delete(asset.storage_key);
          await this.database.query(
            'DELETE FROM uploaded_media_assets WHERE id=$1',
            [asset.id],
          );
          if (removed) {
            deleted += 1;
            bytesFreed += Number(asset.stored_byte_size || 0);
          }
        }
        if (candidates.rows.length < 250) break;
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      return { deleted, bytes_freed: bytesFreed };
    } finally {
      this.cleanupRunning = false;
    }
  }

  async readUploadedAsset(url: string): Promise<Buffer | null> {
    const key = this.keyFromUrl(url);
    return key ? this.storageDriver.read(key) : null;
  }

  async restoreUploadedAsset(url: string, fileBuffer: Buffer): Promise<void> {
    const key = this.keyFromUrl(url);
    if (!key) throw new Error('Invalid uploaded asset URL');
    await this.storageDriver.write(key, fileBuffer);
    const metadata = await this.safeMetadata(fileBuffer);
    await this.recordAsset({
      key,
      url,
      format: this.formatFromKey(key),
      originalSize: fileBuffer.length,
      storedSize: fileBuffer.length,
      width: metadata.width,
      height: metadata.height,
    });
  }

  async deleteImage(url: string): Promise<void> {
    try {
      const key = this.keyFromUrl(url);
      if (!key) return;
      const deleted = await this.storageDriver.delete(key);
      if (!deleted && !key.includes('/')) {
        await this.storageDriver.delete(`_legacy/flat/${key}`);
      }
      await this.database?.query(
        'DELETE FROM uploaded_media_assets WHERE storage_key=$1',
        [key],
      );
    } catch (error) {
      this.logger.error(`Error deleting image at ${url}:`, error);
    }
  }

  /** Attach uploads created before a business UUID was known to their owner. */
  async claimBusinessAssets(
    businessId: string,
    ...values: unknown[]
  ): Promise<void> {
    if (!this.database) return;
    const urls = this.extractUploadedUrls(values);
    if (!urls.length) return;
    await this.database.query(
      `UPDATE uploaded_media_assets
       SET owner_business_id=$1, scope='business'
       WHERE public_url=ANY($2::text[])`,
      [businessId, urls],
    );
  }

  /** Delete replaced uploads immediately, but never while another record uses them. */
  async deleteUnreferencedFromValues(...values: unknown[]): Promise<number> {
    const urls = this.extractUploadedUrls(values);
    let deleted = 0;
    for (const url of urls) {
      if (await this.deleteIfUnreferenced(url)) deleted += 1;
    }
    return deleted;
  }

  async getBusinessAssetUrls(businessId: string): Promise<string[]> {
    if (!this.database) return [];
    const result = await this.database.query<{ public_url: string }>(
      `SELECT public_url FROM uploaded_media_assets
       WHERE owner_business_id=$1`,
      [businessId],
    );
    return result.rows.map((row) => row.public_url);
  }

  private async deleteIfUnreferenced(url: string): Promise<boolean> {
    if (!this.database || !this.keyFromUrl(url)) return false;
    const result = await this.database.query<{ referenced: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM platform_admins admin WHERE $1 IN (admin.logo,admin.avatar,admin.favicon)
         UNION ALL SELECT 1 FROM business_branding branding WHERE $1 IN (branding.logo,branding.favicon,branding.default_avatar)
         UNION ALL SELECT 1 FROM linktrees tree WHERE tree.image=$1 OR tree.template_config::text LIKE '%'||$1||'%'
         UNION ALL SELECT 1 FROM mini_websites website WHERE $1 IN (website.avatar,website.cover)
         UNION ALL SELECT 1 FROM mini_website_locations place WHERE place.image=$1
         UNION ALL SELECT 1 FROM mini_website_items item WHERE $1 IN (item.image,item.secondary_image)
         UNION ALL SELECT 1 FROM mini_website_social_links link WHERE link.custom_icon LIKE '%'||$1||'%'
         UNION ALL SELECT 1 FROM business_profile_change_requests request WHERE request.status='pending' AND request.changes::text LIKE '%'||$1||'%'
         UNION ALL SELECT 1 FROM permission_approval_requests approval WHERE approval.status='pending' AND approval.requested_changes::text LIKE '%'||$1||'%'
         UNION ALL SELECT 1 FROM api_assets api_asset WHERE api_asset.url=$1
       ) referenced`,
      [url],
    );
    if (result.rows[0]?.referenced) return false;
    await this.deleteImage(url);
    return true;
  }

  private extractUploadedUrls(values: unknown[]): string[] {
    const found = new Set<string>();
    for (const value of values) {
      if (value == null) continue;
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      for (const match of text.matchAll(
        /\/images\/upload\/[a-zA-Z0-9._/-]+/g,
      )) {
        found.add(match[0]);
      }
    }
    return [...found];
  }

  private async getPolicy(refresh = false): Promise<MediaPolicy> {
    if (!this.database) return DEFAULT_POLICY;
    if (
      !refresh &&
      this.policyCache &&
      this.policyCache.expiresAt > Date.now()
    ) {
      return this.policyCache.value;
    }
    try {
      const result = await this.database.query<MediaPolicy>(
        `SELECT max_upload_size_mb,allowed_formats,optimize_images,image_quality,
                max_image_dimension,auto_cleanup_unused,unused_grace_hours,updated_at
         FROM platform_media_settings WHERE id=1`,
      );
      const value = result.rows[0] || DEFAULT_POLICY;
      this.policyCache = { value, expiresAt: Date.now() + 60_000 };
      return value;
    } catch (error) {
      this.logger.warn(
        `Media policy unavailable; using safe defaults: ${(error as Error).message}`,
      );
      return DEFAULT_POLICY;
    }
  }

  private validatePolicy(
    buffer: Buffer,
    format: MediaFormat,
    policy: MediaPolicy,
  ): void {
    if (buffer.length > policy.max_upload_size_mb * 1024 * 1024) {
      throw new BadRequestException(
        `Image must be ${policy.max_upload_size_mb} MB or smaller`,
      );
    }
    if (!policy.allowed_formats.includes(format)) {
      throw new BadRequestException(
        `${format.toUpperCase()} uploads are disabled by the platform media policy`,
      );
    }
  }

  private async processImage(
    buffer: Buffer,
    format: MediaFormat,
    policy: MediaPolicy,
  ): Promise<{ buffer: Buffer; width: number | null; height: number | null }> {
    if (!policy.optimize_images || !['jpeg', 'png'].includes(format)) {
      const metadata = await this.safeMetadata(buffer);
      return { buffer, ...metadata };
    }
    let pipeline = sharp(buffer, { failOn: 'warning' }).rotate().resize({
      width: policy.max_image_dimension,
      height: policy.max_image_dimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
    if (format === 'jpeg')
      pipeline = pipeline.jpeg({
        quality: policy.image_quality,
        mozjpeg: true,
      });
    if (format === 'png')
      pipeline = pipeline.png({
        quality: policy.image_quality,
        compressionLevel: 9,
      });
    const result = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: result.data,
      width: result.info.width || null,
      height: result.info.height || null,
    };
  }

  private async safeMetadata(
    buffer: Buffer,
  ): Promise<{ width: number | null; height: number | null }> {
    try {
      const metadata = await sharp(buffer, { animated: true }).metadata();
      return { width: metadata.width || null, height: metadata.height || null };
    } catch {
      return { width: null, height: null };
    }
  }

  private async recordAsset(input: {
    key: string;
    url: string;
    format: MediaFormat;
    originalSize: number;
    storedSize: number;
    width: number | null;
    height: number | null;
  }): Promise<void> {
    if (!this.database) return;
    const ownerMatch = input.key.match(/^businesses\/([0-9a-f-]{36})\//i);
    const scope =
      input.key.startsWith('multitree/') ||
      input.key.startsWith(LEGACY_MULTITREE_STORAGE_PREFIX)
        ? 'multitree'
        : input.key.startsWith('businesses/')
          ? 'business'
          : 'other';
    try {
      await this.database.query(
        `INSERT INTO uploaded_media_assets
          (storage_key,public_url,scope,owner_business_id,format,original_byte_size,stored_byte_size,width,height)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(storage_key) DO UPDATE SET public_url=excluded.public_url,
           format=excluded.format,original_byte_size=excluded.original_byte_size,
           stored_byte_size=excluded.stored_byte_size,width=excluded.width,height=excluded.height`,
        [
          input.key,
          input.url,
          scope,
          ownerMatch?.[1] || null,
          input.format,
          input.originalSize,
          input.storedSize,
          input.width,
          input.height,
        ],
      );
    } catch (error) {
      this.logger.warn(
        `Unable to inventory uploaded media: ${(error as Error).message}`,
      );
    }
  }

  private unreferencedSql(alias: string): string {
    return `NOT EXISTS (SELECT 1 FROM platform_admins admin WHERE ${alias}.public_url IN (admin.logo,admin.avatar,admin.favicon))
      AND NOT EXISTS (SELECT 1 FROM business_branding branding WHERE ${alias}.public_url IN (branding.logo,branding.favicon,branding.default_avatar))
      AND NOT EXISTS (SELECT 1 FROM linktrees tree WHERE tree.image=${alias}.public_url OR tree.template_config::text LIKE '%'||${alias}.public_url||'%')
      AND NOT EXISTS (SELECT 1 FROM mini_websites website WHERE ${alias}.public_url IN (website.avatar,website.cover))
      AND NOT EXISTS (SELECT 1 FROM mini_website_locations place WHERE place.image=${alias}.public_url)
      AND NOT EXISTS (SELECT 1 FROM mini_website_items item WHERE item.image=${alias}.public_url)
      AND NOT EXISTS (SELECT 1 FROM mini_website_social_links link WHERE link.custom_icon LIKE '%'||${alias}.public_url||'%')
      AND NOT EXISTS (SELECT 1 FROM business_profile_change_requests request WHERE request.status='pending' AND request.changes::text LIKE '%'||${alias}.public_url||'%')
      AND NOT EXISTS (SELECT 1 FROM permission_approval_requests approval WHERE approval.status='pending' AND approval.requested_changes::text LIKE '%'||${alias}.public_url||'%')
      AND NOT EXISTS (SELECT 1 FROM api_assets api_asset WHERE api_asset.url=${alias}.public_url)`;
  }

  private formatFromKey(key: string): MediaFormat {
    const extension = key.split('.').pop()?.toLowerCase();
    const normalized = extension === 'jpg' ? 'jpeg' : extension;
    if (!MEDIA_FORMATS.includes(normalized as MediaFormat)) {
      throw new BadRequestException('Unsupported image format');
    }
    return normalized as MediaFormat;
  }

  private keyFromUrl(url: string): string | null {
    if (!url.startsWith(UPLOAD_URL_PREFIX)) return null;
    return this.sanitizeKey(url.slice(UPLOAD_URL_PREFIX.length));
  }

  private sanitizeKey(value: string): string {
    const key = value
      .split(/[\\/]+/)
      .map((segment) =>
        segment.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, ''),
      )
      .filter(Boolean)
      .join('/');
    if (!key) throw new Error('Invalid empty storage key');
    return key;
  }
}
