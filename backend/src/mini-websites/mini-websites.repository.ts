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
              website.cover, website.template_key, website.variation, website.background_style, website.accent_color,
              website.status, website.published_at, website.updated_at
       FROM mini_websites website
       JOIN businesses business ON business.id=website.business_id
       LEFT JOIN business_branding branding ON branding.business_id=website.business_id
       WHERE lower(business.subdomain)=lower($1)
         AND business.account_type='business'
         AND website.status <> 'archived'
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
       WHERE lower(business.subdomain)=lower($1)
         AND business.account_type='business'
         AND website.slug=$2 AND website.status='published'
         AND ${entitledSql(ENTITLEMENT.miniWebsites)}
       GROUP BY website.id`,
      [subdomain, slug],
    );
    return result.rows[0];
  }

  async findPublishedForPlatform(
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
       LEFT JOIN creator_accounts creator ON creator.business_id=business.id
       JOIN root_public_slugs root_slug
         ON root_slug.page_type='mini_website'
        AND root_slug.mini_website_id=website.id
        AND root_slug.slug=$1
       WHERE business.status='active'
         AND (business.account_type='platform'
              OR (business.account_type='creator'
                  AND creator.status='active'
                  AND (creator.paid_started_at IS NOT NULL
                       OR creator.grace_ends_at > NOW())))
         AND website.slug=$1
         AND website.status='published'
       GROUP BY website.id`,
      [slug],
    );
    return result.rows[0];
  }

  async findRootOwnerId(slug: string): Promise<string | undefined> {
    const result = await this.database.query<{ business_id: string }>(
      `SELECT root_slug.business_id
         FROM root_public_slugs root_slug
         JOIN businesses business ON business.id=root_slug.business_id
         LEFT JOIN creator_accounts creator ON creator.business_id=business.id
         JOIN mini_websites website ON website.id=root_slug.mini_website_id
        WHERE root_slug.page_type='mini_website' AND root_slug.slug=$1
          AND business.status='active' AND website.status='published'
          AND (business.account_type='platform'
               OR (business.account_type='creator' AND creator.status='active'
                   AND (creator.paid_started_at IS NOT NULL
                        OR creator.grace_ends_at > NOW())))
        LIMIT 1`,
      [slug],
    );
    return result.rows[0]?.business_id;
  }
}
