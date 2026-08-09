import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { describeError } from '../common/describe-error';
import { RedisService } from '../redis/redis.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import {
  withLinkMetadata,
  type LinkRow,
  type MappedLink,
  type SyncLinkInput,
} from './link.types';

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  private mapLinkRow(row: LinkRow): MappedLink;
  private mapLinkRow(row: LinkRow | undefined): MappedLink | undefined;
  private mapLinkRow(row: LinkRow | undefined): MappedLink | undefined {
    return row ? withLinkMetadata(row) : undefined;
  }

  private async invalidateLinktreeCache(linktreeId: string): Promise<void> {
    try {
      const res = await this.databaseService.query<{
        uid: string;
        seo_name: string | null;
        subdomain: string | null;
      }>(
        `SELECT lt.uid, lt.seo_name, a.subdomain
         FROM linktrees lt
         INNER JOIN businesses a ON lt.business_id = a.id
         WHERE lt.id = $1`,
        [linktreeId],
      );
      const row = res.rows[0];
      if (row?.uid) {
        const sub = row.subdomain?.toLowerCase();
        const keys = [`cache:linktree:uid:${row.uid}`, `cache:linktree:uid:id`];
        if (row.seo_name) {
          keys.push(`cache:linktree:uid:${row.seo_name}`);
        }
        if (sub) {
          keys.push(`cache:linktree:uid:${row.uid}:sub:${sub}`);
          keys.push(`cache:linktree:uid:id:sub:${sub}`);
          if (row.seo_name) {
            keys.push(`cache:linktree:uid:${row.seo_name}:sub:${sub}`);
          }
        }
        await Promise.all(keys.map((k) => this.redisService.del(k)));
      }
    } catch (error) {
      // A failed cache purge must not fail the mutation, but it leaves stale
      // public pages behind, so it has to be visible in the logs.
      this.logger.warn(
        `Failed to clear public linktree cache: ${describeError(error)}`,
      );
    }
  }

  private async verifyLinktreeOwnership(
    linktreeId: string,
    businessId: string,
  ): Promise<void> {
    const res = await this.databaseService.query(
      'SELECT 1 FROM linktrees WHERE id = $1 AND business_id = $2',
      [linktreeId, businessId],
    );
    if (!res.rows || res.rows.length === 0) {
      throw new ForbiddenException('You do not own this linktree page');
    }
  }

  async getLinksByLinktree(linktreeId: string, businessId: string) {
    await this.verifyLinktreeOwnership(linktreeId, businessId);

    const res = await this.databaseService.query<LinkRow>(
      `SELECT id, linktree_id, business_id, platform, url, display_name, description, default_message,
              display_order, original_input, country_code, gps_lat, gps_lng,
              custom_color, custom_icon, created_at, updated_at
       FROM links
       WHERE linktree_id = $1
       ORDER BY display_order ASC`,
      [linktreeId],
    );
    return res.rows.map((row) => this.mapLinkRow(row));
  }

  async createLink(data: CreateLinkDto, businessId: string) {
    await this.verifyLinktreeOwnership(data.linktree_id, businessId);

    const metadata = data.metadata || {};
    const res = await this.databaseService.query<LinkRow>(
      `INSERT INTO links (
        linktree_id, business_id, platform, url, display_name, description, default_message,
        display_order, original_input, country_code, gps_lat, gps_lng,
        custom_color, custom_icon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, linktree_id, platform, url, display_name, description, default_message,
                display_order, original_input, country_code, gps_lat, gps_lng,
                custom_color, custom_icon, created_at, updated_at`,
      [
        data.linktree_id,
        businessId,
        data.platform,
        data.url.trim(),
        data.display_name || null,
        data.description || null,
        data.default_message || null,
        data.display_order || 0,
        metadata.original_input || null,
        metadata.country_code || null,
        metadata.gps_lat !== undefined ? Number(metadata.gps_lat) : null,
        metadata.gps_lng !== undefined ? Number(metadata.gps_lng) : null,
        metadata.custom_color || null,
        metadata.custom_icon || null,
      ],
    );

    await this.invalidateLinktreeCache(data.linktree_id);
    return this.mapLinkRow(res.rows[0]);
  }

  async updateLink(id: string, data: UpdateLinkDto, businessId: string) {
    // Check if the link exists and the business owns it
    const linkRes = await this.databaseService.query<{ linktree_id: string }>(
      'SELECT linktree_id FROM links WHERE id = $1',
      [id],
    );

    if (!linkRes.rows || linkRes.rows.length === 0) {
      throw new NotFoundException('Link not found');
    }

    const linktreeId = linkRes.rows[0].linktree_id;
    await this.verifyLinktreeOwnership(linktreeId, businessId);

    // Get current link details
    const currentRes = await this.databaseService.query<LinkRow>(
      `SELECT platform, url, display_name, description, default_message, display_order,
              original_input, country_code, gps_lat, gps_lng, custom_color, custom_icon
       FROM links WHERE id = $1`,
      [id],
    );
    const current = currentRes.rows[0];

    const platform =
      data.platform !== undefined ? data.platform : current.platform;
    const url = data.url !== undefined ? data.url.trim() : current.url;
    const display_name =
      data.display_name !== undefined
        ? data.display_name
        : current.display_name;
    const description =
      data.description !== undefined ? data.description : current.description;
    const default_message =
      data.default_message !== undefined
        ? data.default_message
        : current.default_message;
    const display_order =
      data.display_order !== undefined
        ? data.display_order
        : current.display_order;

    const currentMetadata = {
      original_input: current.original_input,
      country_code: current.country_code,
      gps_lat: current.gps_lat,
      gps_lng: current.gps_lng,
      custom_color: current.custom_color,
      custom_icon: current.custom_icon,
    };
    const resolvedMetadata =
      data.metadata !== undefined ? data.metadata : currentMetadata;

    const res = await this.databaseService.query<LinkRow>(
      `UPDATE links
       SET platform = $1, url = $2, display_name = $3, description = $4,
           default_message = $5, display_order = $6,
           original_input = $7, country_code = $8, gps_lat = $9, gps_lng = $10,
           custom_color = $11, custom_icon = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING id, linktree_id, platform, url, display_name, description, default_message,
                 display_order, original_input, country_code, gps_lat, gps_lng,
                 custom_color, custom_icon, created_at, updated_at`,
      [
        platform,
        url,
        display_name,
        description,
        default_message,
        display_order,
        resolvedMetadata.original_input || null,
        resolvedMetadata.country_code || null,
        resolvedMetadata.gps_lat !== undefined
          ? Number(resolvedMetadata.gps_lat)
          : null,
        resolvedMetadata.gps_lng !== undefined
          ? Number(resolvedMetadata.gps_lng)
          : null,
        resolvedMetadata.custom_color || null,
        resolvedMetadata.custom_icon || null,
        id,
      ],
    );

    await this.invalidateLinktreeCache(linktreeId);
    return this.mapLinkRow(res.rows[0]);
  }

  async deleteLink(id: string, businessId: string) {
    const linkRes = await this.databaseService.query<{ linktree_id: string }>(
      'SELECT linktree_id FROM links WHERE id = $1',
      [id],
    );

    if (!linkRes.rows || linkRes.rows.length === 0) {
      throw new NotFoundException('Link not found');
    }

    const linktreeId = linkRes.rows[0].linktree_id;
    await this.verifyLinktreeOwnership(linktreeId, businessId);

    await this.databaseService.transaction(async (client) => {
      await client.query(
        `UPDATE public_page_actions
         SET source_link_id = NULL, status = 'archived', updated_at = NOW()
         WHERE source_link_id = $1`,
        [id],
      );
      await client.query('DELETE FROM links WHERE id = $1', [id]);
    });
    await this.invalidateLinktreeCache(linktreeId);

    return { success: true };
  }

  async syncLinks(
    linktreeId: string,
    links: SyncLinkInput[],
    businessId: string,
  ) {
    await this.verifyLinktreeOwnership(linktreeId, businessId);

    await this.databaseService.transaction(async (client) => {
      // Archive their analytics actions before the foreign key clears
      // source_link_id. Otherwise old actions remain active and appear beside
      // the replacement links in analytics.
      await client.query(
        `UPDATE public_page_actions action
         SET source_link_id = NULL, status = 'archived', updated_at = NOW()
         FROM links link
         WHERE action.source_link_id = link.id
           AND link.linktree_id = $1`,
        [linktreeId],
      );

      // 1. Delete all existing links for this page
      await client.query('DELETE FROM links WHERE linktree_id = $1', [
        linktreeId,
      ]);

      // 2. Insert new links
      if (links && links.length > 0) {
        for (let i = 0; i < links.length; i++) {
          const l = links[i];
          const metadata = l.metadata || {};
          await client.query(
            `INSERT INTO links (
              linktree_id, business_id, platform, url, display_name, description, default_message,
              display_order, original_input, country_code, gps_lat, gps_lng,
              custom_color, custom_icon
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              linktreeId,
              businessId,
              l.platform,
              l.url.trim(),
              l.display_name || null,
              l.description || null,
              l.default_message || null,
              i,
              metadata.original_input || null,
              metadata.country_code || null,
              metadata.gps_lat !== undefined ? Number(metadata.gps_lat) : null,
              metadata.gps_lng !== undefined ? Number(metadata.gps_lng) : null,
              metadata.custom_color || null,
              metadata.custom_icon || null,
            ],
          );
        }
      }
    });

    await this.invalidateLinktreeCache(linktreeId);
    return { success: true };
  }
}
