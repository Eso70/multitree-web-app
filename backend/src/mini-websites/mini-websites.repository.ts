import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ENTITLEMENT, entitledSql } from '../billing/entitlement-sql';
import { CONTENT_SELECT, type WebsiteRow } from './mini-website.projection';

@Injectable()
export class MiniWebsitesRepository {
  constructor(private readonly database: DatabaseService) {}

  async listForBusiness(businessId: string): Promise<WebsiteRow[]> {
    const result = await this.database.query<WebsiteRow>(
      `SELECT website.*, ${CONTENT_SELECT},
              MAX(branding.default_avatar) AS business_default_avatar,
              MAX(branding.website_color) AS business_website_color,
              COALESCE(sum(daily.total_views),0)::bigint views,
              COALESCE(sum(daily.total_clicks),0)::bigint actions,
              COALESCE(sum(daily.conversions),0)::bigint conversions
       FROM mini_websites website
       LEFT JOIN business_branding branding ON branding.business_id=website.business_id
       LEFT JOIN public_pages page ON page.source_mini_website_id=website.id
       LEFT JOIN analytics_page_daily daily ON daily.public_page_id=page.id
       WHERE website.business_id=$1 AND website.status <> 'archived'
       GROUP BY website.id ORDER BY website.updated_at DESC`,
      [businessId],
    );
    return result.rows;
  }

  async findForBusiness(
    id: string,
    businessId: string,
  ): Promise<WebsiteRow | undefined> {
    const result = await this.database.query<WebsiteRow>(
      `SELECT website.*, ${CONTENT_SELECT},
              MAX(branding.default_avatar) AS business_default_avatar,
              MAX(branding.website_color) AS business_website_color,
              COALESCE(sum(daily.total_views),0)::bigint views,
              COALESCE(sum(daily.total_clicks),0)::bigint actions,
              COALESCE(sum(daily.conversions),0)::bigint conversions
       FROM mini_websites website
       LEFT JOIN business_branding branding ON branding.business_id=website.business_id
       LEFT JOIN public_pages page ON page.source_mini_website_id=website.id
       LEFT JOIN analytics_page_daily daily ON daily.public_page_id=page.id
       WHERE website.id=$1 AND website.business_id=$2 GROUP BY website.id`,
      [id, businessId],
    );
    return result.rows[0];
  }

  async listForSubdomain(subdomain: string): Promise<WebsiteRow[]> {
    const result = await this.database.query<WebsiteRow>(
      `SELECT website.id, website.name, website.slug, website.headline, website.bio,
              CASE WHEN website.avatar IS NULL OR website.avatar='/images/DefaultAvatar.png'
                   THEN COALESCE(branding.default_avatar, website.avatar)
                   ELSE website.avatar END AS avatar,
              website.cover, website.variation, website.background_style, website.accent_color,
              website.status, website.published_at, website.updated_at
       FROM mini_websites website
       JOIN businesses business ON business.id=website.business_id
       LEFT JOIN business_branding branding ON branding.business_id=website.business_id
       WHERE lower(business.subdomain)=lower($1) AND website.status <> 'archived'
         AND ${entitledSql(ENTITLEMENT.miniWebsites)}
       ORDER BY website.updated_at DESC`,
      [subdomain],
    );
    return result.rows;
  }

  async findPublished(
    subdomain: string,
    slug: string,
  ): Promise<WebsiteRow | undefined> {
    const result = await this.database.query<WebsiteRow>(
      `SELECT website.*, ${CONTENT_SELECT},
              MAX(branding.default_avatar) AS business_default_avatar,
              MAX(branding.website_color) AS business_website_color,
              COALESCE((
                SELECT COUNT(DISTINCT event.visitor_id)
                FROM analytics_events event
                JOIN public_pages p ON p.id = event.public_page_id
                WHERE p.source_mini_website_id = website.id
                  AND event.event_name = 'page_view'
              ), 0)::bigint AS views,
              COALESCE(sum(daily.total_clicks),0)::bigint actions,
              COALESCE(sum(daily.conversions),0)::bigint conversions
       FROM mini_websites website
       JOIN businesses business ON business.id=website.business_id
       LEFT JOIN business_branding branding ON branding.business_id=website.business_id
       LEFT JOIN public_pages page ON page.source_mini_website_id=website.id
       LEFT JOIN analytics_page_daily daily ON daily.public_page_id=page.id
       WHERE lower(business.subdomain)=lower($1) AND website.slug=$2 AND website.status='published'
         AND ${entitledSql(ENTITLEMENT.miniWebsites)}
       GROUP BY website.id`,
      [subdomain, slug],
    );
    return result.rows[0];
  }
}
