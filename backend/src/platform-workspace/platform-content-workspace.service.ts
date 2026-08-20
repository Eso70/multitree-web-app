import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export const PLATFORM_CONTENT_WORKSPACE_ID =
  '00000000-0000-4000-8000-000000000001';

export type PlatformContentBranding = {
  name: string;
  logo: string | null;
  avatar: string | null;
  favicon: string | null;
  accentColor: string;
};

/** Resolves the single internal owner for all MultiTree root-domain content. */
@Injectable()
export class PlatformContentWorkspaceService {
  constructor(private readonly database: DatabaseService) {}

  async getWorkspaceId(): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `SELECT id::text
         FROM businesses
        WHERE account_type = 'platform'
        LIMIT 2`,
    );
    if (result.rows.length !== 1) {
      throw new ServiceUnavailableException(
        'Platform content workspace is unavailable',
      );
    }
    return result.rows[0].id;
  }

  async getBranding(): Promise<PlatformContentBranding> {
    const result = await this.database.query<{
      name: string;
      logo: string | null;
      avatar: string | null;
      favicon: string | null;
      accent_color: string;
    }>(
      `SELECT name, logo, avatar, favicon, accent_color
         FROM platform_admins
        ORDER BY created_at ASC, id ASC
        LIMIT 1`,
    );
    const row = result.rows[0];
    return {
      name: row?.name?.trim() || 'MultiTree',
      logo: row?.logo || '/images/Logo.jpg',
      avatar: row?.avatar || '/images/multitree-logo-mark.png',
      favicon: row?.favicon || '/favicon.ico',
      accentColor: row?.accent_color || '#b6f20d',
    };
  }
}
