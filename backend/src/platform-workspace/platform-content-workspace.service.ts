import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { normalizeSponsorKrdAccent } from '../common/platform-brand';

export const PLATFORM_CONTENT_WORKSPACE_ID =
  '00000000-0000-4000-8000-000000000001';

export type PlatformContentBranding = {
  name: string;
  logo: string | null;
  avatar: string | null;
  favicon: string | null;
  accentColor: string;
};

export type PlatformLinktreeDefaults = {
  default_footer_text: string | null;
  default_footer_phone: string | null;
  default_template: string | null;
  default_background_color: string | null;
  default_footer_hidden: boolean;
  default_whatsapp_enabled: boolean;
  default_avatar: string | null;
};

/** Resolves the single internal owner for all SponsorKrd root-domain content. */
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
      name: row?.name?.trim() || 'Sponsor.krd',
      logo: row?.logo || '/images/Logo.jpg',
      avatar: row?.avatar || '/images/sponsor-krd-logo-mark.png',
      favicon: row?.favicon || '/favicon.ico',
      accentColor: normalizeSponsorKrdAccent(row?.accent_color),
    };
  }

  async getLinktreeDefaults(): Promise<PlatformLinktreeDefaults> {
    const workspaceId = await this.getWorkspaceId();
    const result = await this.database.query<PlatformLinktreeDefaults>(
      `SELECT defaults.footer_text AS default_footer_text,
              defaults.footer_phone AS default_footer_phone,
              defaults.template_key AS default_template,
              defaults.background_color AS default_background_color,
              COALESCE(defaults.footer_hidden, false) AS default_footer_hidden,
              COALESCE(defaults.whatsapp_enabled, false) AS default_whatsapp_enabled,
              branding.default_avatar
         FROM businesses business
         LEFT JOIN business_defaults defaults ON defaults.business_id = business.id
         LEFT JOIN business_branding branding ON branding.business_id = business.id
        WHERE business.id = $1`,
      [workspaceId],
    );
    return (
      result.rows[0] || {
        default_footer_text: null,
        default_footer_phone: null,
        default_template: null,
        default_background_color: null,
        default_footer_hidden: false,
        default_whatsapp_enabled: false,
        default_avatar: null,
      }
    );
  }
}
