import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { OperationalMetricsService } from '../observability/operational-metrics.service';
import { SecretCryptoService } from '../auth/secret-crypto.service';
import type { SessionUser } from '../auth/session.service';
import type {
  CreateAnnouncementDto,
  CreateConversationDto,
  CreateMessageDto,
  UpdateAnnouncementDto,
  UpdateConversationDto,
} from './dto/communication.dto';

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  announcementType: string;
  priority: string;
  audienceType: 'all' | 'plans' | 'businesses';
  audienceFilter: { values?: string[] } | null;
  channels: string[];
  status: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  publishAt: Date | string | null;
  publishedAt: Date | string | null;
  expiresAt: Date | string | null;
  archivedAt: Date | string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
  homepagePlacement?: string | null;
  homepagePriority?: number | null;
  homepageDismissible?: boolean | null;
  encryptedContent?: Buffer | null;
};

const ANNOUNCEMENT_SELECT = `
  SELECT a.id, a.title, a.message,
    a.announcement_type AS "announcementType",
    a.priority, a.audience_type AS "audienceType",
    a.audience_filter AS "audienceFilter", a.channels, a.status,
    a.cta_label AS "ctaLabel", a.cta_url AS "ctaUrl",
    a.publish_at AS "publishAt", a.published_at AS "publishedAt",
    a.expires_at AS "expiresAt", a.archived_at AS "archivedAt",
    a.encrypted_content AS "encryptedContent",
    a.created_by::text AS "createdBy", admin.name AS "createdByName",
    a.created_at AS "createdAt", a.updated_at AS "updatedAt",
    COUNT(d.id)::int AS "deliveredCount",
    COUNT(d.id) FILTER (WHERE d.read_at IS NOT NULL)::int AS "readCount",
    COUNT(d.id) FILTER (WHERE d.status = 'failed')::int AS "failedCount",
    hp.placement AS "homepagePlacement",
    hp.display_priority::int AS "homepagePriority",
    hp.is_dismissible AS "homepageDismissible"
  FROM communication_announcements a
  JOIN platform_admins admin ON admin.id = a.created_by
  LEFT JOIN communication_announcement_deliveries d ON d.announcement_id = a.id
  LEFT JOIN communication_homepage_placements hp ON hp.announcement_id = a.id`;

@Injectable()
export class CommunicationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommunicationService.name);
  private scheduler?: ReturnType<typeof setInterval>;

  constructor(
    private readonly database: DatabaseService,
    private readonly crypto: SecretCryptoService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  private encryptedContent(title: string, body: string): Buffer {
    return this.crypto.encryptJson({ title, body });
  }

  private decryptContent(
    encrypted: Buffer | null | undefined,
    title: string,
    body: string,
  ) {
    if (!encrypted) return { title, body };
    const value = this.crypto.decryptJson(encrypted);
    return {
      title: typeof value.title === 'string' ? value.title : title,
      body: typeof value.body === 'string' ? value.body : body,
    };
  }

  private decodeAnnouncement<T extends AnnouncementRow>(item: T): T {
    const content = this.decryptContent(
      item.encryptedContent,
      item.title,
      item.message,
    );
    return { ...item, title: content.title, message: content.body };
  }

  onModuleInit() {
    this.metrics.registerWorker('communication-scheduler', 180_000);
    this.scheduler = setInterval(() => {
      void this.runScheduler();
    }, 60_000);
    this.scheduler.unref?.();
    void this.runScheduler();
  }

  onModuleDestroy() {
    if (this.scheduler) clearInterval(this.scheduler);
  }

  private async runScheduler(): Promise<void> {
    const startedAt = Date.now();
    let succeeded = false;
    try {
      await this.processScheduledAnnouncements();
      succeeded = true;
    } catch (error) {
      this.logger.warn(
        `Communication scheduler failed: ${(error as Error).message}`,
      );
    } finally {
      this.metrics.recordWorkerRun(
        'communication-scheduler',
        startedAt,
        succeeded,
      );
    }
  }

  async getOverview() {
    await this.processScheduledAnnouncements();
    const [announcementResult, conversationResult, notificationResult] =
      await Promise.all([
        this.database.query<{
          total: number;
          active: number;
          scheduled: number;
          drafts: number;
          homepage: number;
          failed: number;
        }>(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'published')::int AS active,
          COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
          COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
          COUNT(*) FILTER (WHERE status = 'published' AND channels @> ARRAY['homepage']::text[])::int AS homepage,
          COALESCE((SELECT COUNT(*) FROM communication_announcement_deliveries WHERE status = 'failed'), 0)::int AS failed
        FROM communication_announcements`),
        this.database.query<{
          open: number;
          waitingPlatform: number;
          unreadMessages: number;
        }>(`SELECT
          COUNT(*) FILTER (WHERE status IN ('open', 'waiting_business', 'waiting_platform'))::int AS open,
          COUNT(*) FILTER (WHERE status = 'waiting_platform')::int AS "waitingPlatform",
          COALESCE(SUM((SELECT COUNT(*) FROM communication_messages m
            WHERE m.conversation_id = c.id AND m.sender_type = 'business'
              AND m.created_at > COALESCE(c.platform_last_read_at, '-infinity'::timestamptz))), 0)::int AS "unreadMessages"
        FROM communication_conversations c`),
        this.database.query<{ unread: number }>(`SELECT COUNT(*)::int AS unread
          FROM communication_notifications
          WHERE recipient_type = 'platform-admin' AND read_at IS NULL AND archived_at IS NULL`),
      ]);

    return {
      announcements: announcementResult.rows[0],
      conversations: conversationResult.rows[0],
      notifications: notificationResult.rows[0],
    };
  }

  async listAnnouncements(input: {
    status?: string;
    search?: string;
    limit?: number;
  }) {
    await this.processScheduledAnnouncements();
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (input.status && input.status !== 'all') {
      values.push(input.status);
      clauses.push(`a.status = $${values.length}`);
    }
    values.push(250);
    const result = await this.database.query<AnnouncementRow>(
      `${ANNOUNCEMENT_SELECT}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       GROUP BY a.id, admin.name, hp.placement, hp.display_priority, hp.is_dismissible
       ORDER BY COALESCE(a.published_at, a.publish_at, a.created_at) DESC
       LIMIT $${values.length}`,
      values,
    );
    const decoded = result.rows.map((item) => this.decodeAnnouncement(item));
    const search = input.search?.trim().toLocaleLowerCase();
    const filtered = search
      ? decoded.filter((item) =>
          `${item.title} ${item.message}`.toLocaleLowerCase().includes(search),
        )
      : decoded;
    return filtered.slice(0, Math.min(Math.max(input.limit || 100, 1), 250));
  }

  async createAnnouncement(data: CreateAnnouncementDto, actor: SessionUser) {
    const normalized = this.normalizeAnnouncement(data);
    const scheduled =
      normalized.publishAt && normalized.publishAt.getTime() > Date.now();
    const privateContent = !normalized.channels.includes('homepage');
    const encryptedContent = privateContent
      ? this.encryptedContent(normalized.title, normalized.message)
      : null;
    const result = await this.database.transaction(async (client) => {
      const created = await client.query<{ id: string }>(
        `INSERT INTO communication_announcements
          (title, message, announcement_type, priority, audience_type,
           audience_filter, channels, status, cta_label, cta_url,
           publish_at, expires_at, created_by, encrypted_content)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text[], $8, $9, $10,
                 $11, $12, $13::uuid, $14)
         RETURNING id`,
        [
          privateContent ? '[encrypted]' : normalized.title,
          privateContent ? '[encrypted]' : normalized.message,
          normalized.announcementType,
          normalized.priority,
          normalized.audienceType,
          JSON.stringify({ values: normalized.audienceValues }),
          normalized.channels,
          scheduled ? 'scheduled' : 'draft',
          normalized.ctaLabel,
          normalized.ctaUrl,
          normalized.publishAt,
          normalized.expiresAt,
          actor.id,
          encryptedContent,
        ],
      );
      await this.upsertHomepagePlacement(
        client,
        created.rows[0].id,
        normalized,
      );
      return created.rows[0].id;
    });
    return this.getAnnouncement(result);
  }

  async updateAnnouncement(id: string, data: UpdateAnnouncementDto) {
    const normalized = this.normalizeAnnouncement(data);
    const scheduled =
      normalized.publishAt && normalized.publishAt.getTime() > Date.now();
    const privateContent = !normalized.channels.includes('homepage');
    const encryptedContent = privateContent
      ? this.encryptedContent(normalized.title, normalized.message)
      : null;
    await this.database.transaction(async (client) => {
      const updated = await client.query(
        `UPDATE communication_announcements SET
           title=$2, message=$3, announcement_type=$4, priority=$5,
           audience_type=$6, audience_filter=$7::jsonb, channels=$8::text[],
           status=$9, cta_label=$10, cta_url=$11, publish_at=$12,
           expires_at=$13, encrypted_content=$14, updated_at=NOW()
         WHERE id=$1::uuid AND status IN ('draft', 'scheduled')
         RETURNING id`,
        [
          id,
          privateContent ? '[encrypted]' : normalized.title,
          privateContent ? '[encrypted]' : normalized.message,
          normalized.announcementType,
          normalized.priority,
          normalized.audienceType,
          JSON.stringify({ values: normalized.audienceValues }),
          normalized.channels,
          scheduled ? 'scheduled' : 'draft',
          normalized.ctaLabel,
          normalized.ctaUrl,
          normalized.publishAt,
          normalized.expiresAt,
          encryptedContent,
        ],
      );
      if (!updated.rowCount) {
        throw new BadRequestException(
          'Only draft or scheduled announcements can be edited',
        );
      }
      await this.upsertHomepagePlacement(client, id, normalized);
    });
    return this.getAnnouncement(id);
  }

  async publishAnnouncement(id: string, actorId: string) {
    await this.database.transaction(async (client) => {
      const claimed = await client.query<AnnouncementRow>(
        `UPDATE communication_announcements SET
           status='published', published_at=NOW(), publish_at=COALESCE(publish_at, NOW()),
           published_by=$2::uuid, updated_at=NOW()
         WHERE id=$1::uuid AND status IN ('draft', 'scheduled')
         RETURNING id, title, message, announcement_type AS "announcementType",
           priority, audience_type AS "audienceType",
           audience_filter AS "audienceFilter", channels,
           cta_label AS "ctaLabel", cta_url AS "ctaUrl",
           encrypted_content AS "encryptedContent"`,
        [id, actorId],
      );
      if (!claimed.rowCount) {
        throw new BadRequestException(
          'Announcement is already published or archived',
        );
      }
      await this.createAnnouncementDeliveries(
        client,
        this.decodeAnnouncement(claimed.rows[0]),
      );
    });
    return this.getAnnouncement(id);
  }

  async archiveAnnouncement(id: string) {
    const result = await this.database.query(
      `UPDATE communication_announcements
       SET status='archived', archived_at=NOW(), updated_at=NOW()
       WHERE id=$1::uuid AND status <> 'archived' RETURNING id`,
      [id],
    );
    if (!result.rowCount) throw new NotFoundException('Announcement not found');
    await this.database.query(
      `UPDATE communication_announcement_deliveries
       SET status='archived', archived_at=NOW()
       WHERE announcement_id=$1::uuid AND status <> 'archived'`,
      [id],
    );
    return { id, status: 'archived' };
  }

  async getAnnouncement(id: string) {
    const result = await this.database.query<AnnouncementRow>(
      `${ANNOUNCEMENT_SELECT}
       WHERE a.id=$1::uuid
       GROUP BY a.id, admin.name, hp.placement, hp.display_priority, hp.is_dismissible`,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundException('Announcement not found');
    return this.decodeAnnouncement(result.rows[0]);
  }

  async listNotifications(user: SessionUser, limit = 30) {
    await this.processScheduledAnnouncements();
    const ownerColumn =
      user.role === 'platform-admin' ? 'platform_admin_id' : 'business_id';
    const result = await this.database.query<{
      id: string;
      kind: string;
      priority: string;
      title: string;
      body: string;
      sourceType: string | null;
      sourceId: string | null;
      actionUrl: string | null;
      readAt: Date | string | null;
      encryptedContent: Buffer | null;
      createdAt: Date | string;
    }>(
      `SELECT id, kind, priority, title, body,
              source_type AS "sourceType", source_id::text AS "sourceId",
              action_url AS "actionUrl", read_at AS "readAt",
              encrypted_content AS "encryptedContent",
              created_at AS "createdAt"
       FROM communication_notifications
       WHERE recipient_type=$1 AND ${ownerColumn}=$2::uuid AND archived_at IS NULL
       ORDER BY created_at DESC
       LIMIT $3`,
      [user.role, user.id, Math.min(Math.max(limit, 1), 100)],
    );
    const unread = await this.database.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM communication_notifications
       WHERE recipient_type=$1 AND ${ownerColumn}=$2::uuid
         AND read_at IS NULL AND archived_at IS NULL`,
      [user.role, user.id],
    );
    return {
      items: result.rows.map((item) => {
        const content = this.decryptContent(
          item.encryptedContent,
          item.title,
          item.body,
        );
        return { ...item, title: content.title, body: content.body };
      }),
      unreadCount: unread.rows[0]?.count || 0,
    };
  }

  async markNotificationRead(user: SessionUser, id: string) {
    const ownerColumn =
      user.role === 'platform-admin' ? 'platform_admin_id' : 'business_id';
    const result = await this.database.query<{
      sourceType: string;
      sourceId: string;
    }>(
      `UPDATE communication_notifications SET read_at=COALESCE(read_at, NOW())
       WHERE id=$1::uuid AND recipient_type=$2 AND ${ownerColumn}=$3::uuid
       RETURNING source_type AS "sourceType", source_id::text AS "sourceId"`,
      [id, user.role, user.id],
    );
    if (!result.rowCount) throw new NotFoundException('Notification not found');
    const item = result.rows[0];
    if (user.role === 'business' && item.sourceType === 'announcement') {
      await this.database.query(
        `UPDATE communication_announcement_deliveries
         SET read_at=COALESCE(read_at, NOW()), status='read'
         WHERE announcement_id=$1::uuid AND business_id=$2::uuid`,
        [item.sourceId, user.id],
      );
    }
    return { id, read: true };
  }

  async markAllNotificationsRead(user: SessionUser) {
    const ownerColumn =
      user.role === 'platform-admin' ? 'platform_admin_id' : 'business_id';
    const result = await this.database.query(
      `UPDATE communication_notifications SET read_at=COALESCE(read_at, NOW())
       WHERE recipient_type=$1 AND ${ownerColumn}=$2::uuid
         AND read_at IS NULL AND archived_at IS NULL`,
      [user.role, user.id],
    );
    if (user.role === 'business') {
      await this.database.query(
        `UPDATE communication_announcement_deliveries
         SET read_at=COALESCE(read_at, NOW()), status='read'
         WHERE business_id=$1::uuid AND read_at IS NULL`,
        [user.id],
      );
    }
    return { updated: result.rowCount || 0 };
  }

  async archiveNotification(user: SessionUser, id: string) {
    const ownerColumn =
      user.role === 'platform-admin' ? 'platform_admin_id' : 'business_id';
    const result = await this.database.query(
      `UPDATE communication_notifications SET archived_at=NOW()
       WHERE id=$1::uuid AND recipient_type=$2 AND ${ownerColumn}=$3::uuid
         AND archived_at IS NULL
       RETURNING id`,
      [id, user.role, user.id],
    );
    if (!result.rowCount) throw new NotFoundException('Notification not found');
    return { id, archived: true };
  }

  async archiveAllNotifications(user: SessionUser) {
    const ownerColumn =
      user.role === 'platform-admin' ? 'platform_admin_id' : 'business_id';
    const result = await this.database.query(
      `UPDATE communication_notifications SET archived_at=NOW()
       WHERE recipient_type=$1 AND ${ownerColumn}=$2::uuid AND archived_at IS NULL`,
      [user.role, user.id],
    );
    return { archived: result.rowCount || 0 };
  }

  async listBusinessBanners(businessId: string) {
    await this.processScheduledAnnouncements();
    const result = await this.database.query<{
      id: string;
      title: string;
      message: string;
      announcementType: string;
      priority: string;
      ctaLabel: string | null;
      ctaUrl: string | null;
      publishedAt: Date | string | null;
      expiresAt: Date | string | null;
      readAt: Date | string | null;
      encryptedContent: Buffer | null;
    }>(
      `SELECT a.id, a.title, a.message, a.announcement_type AS "announcementType",
              a.priority, a.cta_label AS "ctaLabel", a.cta_url AS "ctaUrl",
              a.published_at AS "publishedAt", a.expires_at AS "expiresAt",
              d.read_at AS "readAt", a.encrypted_content AS "encryptedContent"
       FROM communication_announcement_deliveries d
       JOIN communication_announcements a ON a.id=d.announcement_id
       WHERE d.business_id=$1::uuid AND a.status='published'
         AND a.channels @> ARRAY['dashboard_banner']::text[]
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
         AND d.archived_at IS NULL
       ORDER BY CASE a.priority WHEN 'critical' THEN 3 WHEN 'important' THEN 2 ELSE 1 END DESC,
                a.published_at DESC`,
      [businessId],
    );
    return result.rows.map((item) => {
      const content = this.decryptContent(
        item.encryptedContent,
        item.title,
        item.message,
      );
      return { ...item, title: content.title, message: content.body };
    });
  }

  async listHomepageCommunications() {
    await this.processScheduledAnnouncements();
    const result = await this.database.query(
      `SELECT a.id, a.title, a.message, a.announcement_type AS "announcementType",
              a.priority, a.cta_label AS "ctaLabel", a.cta_url AS "ctaUrl",
              a.published_at AS "publishedAt", a.expires_at AS "expiresAt",
              hp.placement, hp.display_priority AS "displayPriority",
              hp.is_dismissible AS "isDismissible"
       FROM communication_homepage_placements hp
       JOIN communication_announcements a ON a.id=hp.announcement_id
       WHERE a.status='published' AND a.channels @> ARRAY['homepage']::text[]
         AND a.published_at <= NOW()
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
       ORDER BY hp.display_priority DESC,
                CASE a.priority WHEN 'critical' THEN 3 WHEN 'important' THEN 2 ELSE 1 END DESC,
                a.published_at DESC
       LIMIT 10`,
    );
    return result.rows;
  }

  async listConversations(user: SessionUser, status?: string) {
    const values: unknown[] = [];
    const clauses: string[] = [];
    if (user.role === 'business') {
      values.push(user.id);
      clauses.push(`c.business_id=$${values.length}::uuid`);
    }
    if (status && status !== 'all') {
      values.push(status);
      clauses.push(`c.status=$${values.length}`);
    }
    const result = await this.database.query<{
      id: string;
      businessId: string;
      businessName: string;
      planName: string;
      subject: string;
      encryptedSubject: Buffer | null;
      category: string;
      priority: string;
      status: string;
      assignedAdminId: string | null;
      assignedAdminName: string | null;
      createdByType: string;
      lastMessageAt: Date | string;
      createdAt: Date | string;
      lastMessage: string | null;
      lastMessageEncrypted: Buffer | null;
      unreadCount: number;
    }>(
      `SELECT c.id, c.business_id::text AS "businessId", b.name AS "businessName",
              COALESCE(sp.name, INITCAP(b.plan)) AS "planName",
              c.subject, c.encrypted_subject AS "encryptedSubject",
              c.category, c.priority, c.status,
              c.assigned_admin_id::text AS "assignedAdminId", sa.name AS "assignedAdminName",
              c.created_by_type AS "createdByType", c.last_message_at AS "lastMessageAt",
              c.created_at AS "createdAt",
              (SELECT body FROM communication_messages latest
               WHERE latest.conversation_id=c.id
               ORDER BY latest.created_at DESC LIMIT 1) AS "lastMessage",
              (SELECT encrypted_body FROM communication_messages latest
               WHERE latest.conversation_id=c.id
               ORDER BY latest.created_at DESC LIMIT 1) AS "lastMessageEncrypted",
              (SELECT COUNT(*)::int FROM communication_messages unread
               WHERE unread.conversation_id=c.id
                 AND unread.sender_type=$${values.length + 1}
                 AND unread.created_at > COALESCE(
                   ${user.role === 'business' ? 'c.business_last_read_at' : 'c.platform_last_read_at'},
                   '-infinity'::timestamptz)) AS "unreadCount"
       FROM communication_conversations c
       JOIN businesses b ON b.id=c.business_id
       LEFT JOIN business_subscriptions bs ON bs.business_id=b.id
       LEFT JOIN billing_subscription_plans sp ON sp.id=bs.subscription_plan_id
       LEFT JOIN platform_admins sa ON sa.id=c.assigned_admin_id
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY c.last_message_at DESC
       LIMIT 200`,
      [...values, user.role === 'business' ? 'platform-admin' : 'business'],
    );
    return result.rows.map((item) => ({
      ...item,
      subject: this.crypto.decryptText(item.encryptedSubject, item.subject),
      lastMessage: this.crypto.decryptText(
        item.lastMessageEncrypted,
        item.lastMessage || '',
      ),
    }));
  }

  async getConversation(user: SessionUser, id: string) {
    const ownerClause =
      user.role === 'business' ? 'AND c.business_id=$2::uuid' : '';
    const values = user.role === 'business' ? [id, user.id] : [id];
    const conversation = await this.database.query<{
      id: string;
      businessId: string;
      businessName: string;
      subject: string;
      encryptedSubject: Buffer | null;
      category: string;
      priority: string;
      status: string;
      assignedAdminId: string | null;
      lastMessageAt: Date | string;
      createdAt: Date | string;
    }>(
      `SELECT c.id, c.business_id::text AS "businessId", b.name AS "businessName",
              c.subject, c.encrypted_subject AS "encryptedSubject",
              c.category, c.priority, c.status,
              c.assigned_admin_id::text AS "assignedAdminId",
              c.last_message_at AS "lastMessageAt", c.created_at AS "createdAt"
       FROM communication_conversations c JOIN businesses b ON b.id=c.business_id
       WHERE c.id=$1::uuid ${ownerClause}`,
      values,
    );
    if (!conversation.rows[0])
      throw new NotFoundException('Conversation not found');
    const messages = await this.database.query<{
      id: string;
      senderType: string;
      body: string;
      encryptedBody: Buffer | null;
      createdAt: Date | string;
      senderName: string | null;
    }>(
      `SELECT m.id, m.sender_type AS "senderType", m.body,
              m.encrypted_body AS "encryptedBody", m.created_at AS "createdAt",
              CASE WHEN m.sender_type='platform-admin' THEN sa.name ELSE b.name END AS "senderName"
       FROM communication_messages m
       LEFT JOIN platform_admins sa ON sa.id=m.sender_admin_id
       LEFT JOIN businesses b ON b.id=m.sender_business_id
       WHERE m.conversation_id=$1::uuid
       ORDER BY m.created_at ASC`,
      [id],
    );
    await this.database.query(
      `UPDATE communication_conversations SET
         ${user.role === 'business' ? 'business_last_read_at' : 'platform_last_read_at'}=NOW()
       WHERE id=$1::uuid`,
      [id],
    );
    const thread = conversation.rows[0];
    return {
      ...thread,
      subject: this.crypto.decryptText(thread.encryptedSubject, thread.subject),
      messages: messages.rows.map((message) => ({
        ...message,
        body: this.crypto.decryptText(message.encryptedBody, message.body),
      })),
    };
  }

  async createConversation(user: SessionUser, data: CreateConversationDto) {
    const businessId = user.role === 'business' ? user.id : data.businessId;
    if (!businessId) throw new BadRequestException('Business is required');
    const encryptedSubject = this.crypto.encryptText(data.subject.trim());
    const encryptedMessage = this.crypto.encryptText(data.message.trim());
    const result = await this.database.transaction(async (client) => {
      const business = await client.query<{ name: string }>(
        `SELECT name FROM businesses WHERE id=$1::uuid`,
        [businessId],
      );
      if (!business.rows[0]) throw new NotFoundException('Business not found');
      const conversation = await client.query<{ id: string }>(
        `INSERT INTO communication_conversations
          (business_id, subject, encrypted_subject, category, priority, status, created_by_type,
           business_last_read_at, platform_last_read_at)
         VALUES ($1::uuid, '[encrypted]', $2, $3, $4, $5, $6::varchar,
           CASE WHEN $6::varchar='business' THEN NOW() ELSE NULL END,
           CASE WHEN $6::varchar='platform-admin' THEN NOW() ELSE NULL END)
         RETURNING id`,
        [
          businessId,
          encryptedSubject,
          data.category,
          data.priority || 'normal',
          user.role === 'business' ? 'waiting_platform' : 'waiting_business',
          user.role,
        ],
      );
      const conversationId = conversation.rows[0].id;
      await client.query(
        `INSERT INTO communication_messages
          (conversation_id, sender_type, sender_admin_id, sender_business_id, body, encrypted_body)
         VALUES ($1::uuid, $2::varchar,
           CASE WHEN $2::varchar='platform-admin' THEN $3::uuid ELSE NULL END,
           CASE WHEN $2::varchar='business' THEN $3::uuid ELSE NULL END,
           '[encrypted]', $4)`,
        [conversationId, user.role, user.id, encryptedMessage],
      );
      await this.notifyConversationRecipient(
        client,
        user,
        businessId,
        business.rows[0].name,
        conversationId,
        data.subject,
        data.message,
      );
      return conversationId;
    });
    return this.getConversation(user, result);
  }

  async replyToConversation(
    user: SessionUser,
    id: string,
    data: CreateMessageDto,
  ) {
    const result = await this.database.transaction(async (client) => {
      const conversation = await client.query<{
        businessId: string;
        businessName: string;
        subject: string;
        encryptedSubject: Buffer | null;
        status: string;
      }>(
        `SELECT c.business_id::text AS "businessId", b.name AS "businessName",
                c.subject, c.encrypted_subject AS "encryptedSubject", c.status
         FROM communication_conversations c JOIN businesses b ON b.id=c.business_id
         WHERE c.id=$1::uuid ${user.role === 'business' ? 'AND c.business_id=$2::uuid' : ''}
         FOR UPDATE`,
        user.role === 'business' ? [id, user.id] : [id],
      );
      const item = conversation.rows[0];
      if (!item) throw new NotFoundException('Conversation not found');
      if (['resolved', 'archived'].includes(item.status)) {
        throw new BadRequestException(
          'Resolved conversations must be reopened before replying',
        );
      }
      const encryptedMessage = this.crypto.encryptText(data.message.trim());
      await client.query(
        `INSERT INTO communication_messages
          (conversation_id, sender_type, sender_admin_id, sender_business_id, body, encrypted_body)
         VALUES ($1::uuid, $2::varchar,
           CASE WHEN $2::varchar='platform-admin' THEN $3::uuid ELSE NULL END,
           CASE WHEN $2::varchar='business' THEN $3::uuid ELSE NULL END,
           '[encrypted]', $4)`,
        [id, user.role, user.id, encryptedMessage],
      );
      await client.query(
        `UPDATE communication_conversations SET
           status=$2, last_message_at=NOW(), updated_at=NOW(),
           ${user.role === 'business' ? 'business_last_read_at' : 'platform_last_read_at'}=NOW()
         WHERE id=$1::uuid`,
        [
          id,
          user.role === 'business' ? 'waiting_platform' : 'waiting_business',
        ],
      );
      await this.notifyConversationRecipient(
        client,
        user,
        item.businessId,
        item.businessName,
        id,
        this.crypto.decryptText(item.encryptedSubject, item.subject),
        data.message,
      );
      return id;
    });
    return this.getConversation(user, result);
  }

  async updateConversation(id: string, data: UpdateConversationDto) {
    const result = await this.database.query(
      `UPDATE communication_conversations SET
         status=COALESCE($2, status), priority=COALESCE($3, priority),
         assigned_admin_id=COALESCE($4::uuid, assigned_admin_id),
         resolved_at=CASE WHEN $2='resolved' THEN NOW() WHEN $2 IS NOT NULL THEN NULL ELSE resolved_at END,
         updated_at=NOW()
       WHERE id=$1::uuid RETURNING id`,
      [
        id,
        data.status || null,
        data.priority || null,
        data.assignedAdminId || null,
      ],
    );
    if (!result.rowCount) throw new NotFoundException('Conversation not found');
    return { id, ...data };
  }

  async processScheduledAnnouncements() {
    await this.database.query(
      `UPDATE communication_announcements
       SET status='expired', updated_at=NOW()
       WHERE status='published' AND expires_at IS NOT NULL AND expires_at <= NOW()`,
    );
    const due = await this.database.query<{ id: string; createdBy: string }>(
      `SELECT id, created_by::text AS "createdBy"
       FROM communication_announcements
       WHERE status='scheduled' AND publish_at <= NOW()
       ORDER BY publish_at ASC LIMIT 25`,
    );
    for (const announcement of due.rows) {
      try {
        await this.publishAnnouncement(announcement.id, announcement.createdBy);
        this.metrics.recordWorkerJob('communication-scheduler', 'completed');
      } catch (error) {
        this.metrics.recordWorkerJob('communication-scheduler', 'failed');
        if (!(error instanceof BadRequestException)) throw error;
      }
    }
  }

  private normalizeAnnouncement(data: CreateAnnouncementDto) {
    const audienceValues = [
      ...new Set(
        (data.audienceValues || []).map((v) => v.trim()).filter(Boolean),
      ),
    ];
    if (data.audienceType !== 'all' && audienceValues.length === 0) {
      throw new BadRequestException('Choose at least one audience value');
    }
    if (
      data.audienceType === 'businesses' &&
      audienceValues.some((v) => !/^[0-9a-f-]{36}$/i.test(v))
    ) {
      throw new BadRequestException('Invalid business audience');
    }
    const publishAt = data.publishAt ? new Date(data.publishAt) : null;
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (publishAt && expiresAt && expiresAt <= publishAt) {
      throw new BadRequestException('Expiration must be after publishing');
    }
    if (expiresAt && expiresAt <= new Date()) {
      throw new BadRequestException('Expiration must be in the future');
    }
    const ctaUrl = data.ctaUrl?.trim() || null;
    if (ctaUrl && !ctaUrl.startsWith('/') && !/^https:\/\//i.test(ctaUrl)) {
      throw new BadRequestException(
        'Action URL must be an internal path or HTTPS URL',
      );
    }
    return {
      title: data.title.trim(),
      message: data.message.trim(),
      announcementType: data.announcementType,
      priority: data.priority,
      audienceType: data.audienceType,
      audienceValues,
      channels: [...new Set(data.channels)],
      ctaLabel: data.ctaLabel?.trim() || null,
      ctaUrl,
      publishAt,
      expiresAt,
      homepagePlacement: data.homepagePlacement || 'top_banner',
      homepagePriority: data.homepagePriority || 0,
      homepageDismissible: data.homepageDismissible !== false,
    };
  }

  private async upsertHomepagePlacement(
    client: PoolClient,
    announcementId: string,
    data: ReturnType<CommunicationService['normalizeAnnouncement']>,
  ) {
    if (!data.channels.includes('homepage')) {
      await client.query(
        `DELETE FROM communication_homepage_placements WHERE announcement_id=$1::uuid`,
        [announcementId],
      );
      return;
    }
    await client.query(
      `INSERT INTO communication_homepage_placements
        (announcement_id, placement, display_priority, is_dismissible)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (announcement_id) DO UPDATE SET
         placement=EXCLUDED.placement,
         display_priority=EXCLUDED.display_priority,
         is_dismissible=EXCLUDED.is_dismissible,
         updated_at=NOW()`,
      [
        announcementId,
        data.homepagePlacement,
        data.homepagePriority,
        data.homepageDismissible,
      ],
    );
  }

  private async createAnnouncementDeliveries(
    client: PoolClient,
    announcement: AnnouncementRow,
  ) {
    if (
      !announcement.channels.includes('business_bell') &&
      !announcement.channels.includes('dashboard_banner')
    ) {
      return;
    }
    const audienceValues = announcement.audienceFilter?.values || [];
    const audienceClause =
      announcement.audienceType === 'plans'
        ? `AND LOWER(sp.code) = ANY($2::text[])`
        : announcement.audienceType === 'businesses'
          ? `AND b.id = ANY($2::uuid[])`
          : '';
    await client.query(
      `INSERT INTO communication_announcement_deliveries
        (announcement_id, business_id, status)
       SELECT $1::uuid, b.id, 'delivered'
       FROM businesses b
       LEFT JOIN business_subscriptions bs ON bs.business_id=b.id
       LEFT JOIN billing_subscription_plans sp ON sp.id=bs.subscription_plan_id
       WHERE b.status='active' ${audienceClause}
       ON CONFLICT (announcement_id, business_id) DO NOTHING`,
      announcement.audienceType === 'all'
        ? [announcement.id]
        : [announcement.id, audienceValues.map((value) => value.toLowerCase())],
    );
    if (!announcement.channels.includes('business_bell')) return;
    const encryptedNotification = this.encryptedContent(
      announcement.title,
      announcement.message,
    );
    await client.query(
      `INSERT INTO communication_notifications
        (recipient_type, business_id, kind, priority, title, body,
         encrypted_content, source_type, source_id, action_url)
       SELECT 'business', d.business_id, 'announcement', $2,
              '[encrypted]', '[encrypted]', $3,
              'announcement', $1::uuid, $4
       FROM communication_announcement_deliveries d
       WHERE d.announcement_id=$1::uuid
         AND NOT EXISTS (
           SELECT 1 FROM communication_notifications n
           WHERE n.recipient_type='business' AND n.business_id=d.business_id
             AND n.source_type='announcement' AND n.source_id=$1::uuid
         )`,
      [
        announcement.id,
        announcement.priority,
        encryptedNotification,
        announcement.ctaUrl || '/business',
      ],
    );
  }

  private async notifyConversationRecipient(
    client: PoolClient,
    sender: SessionUser,
    businessId: string,
    businessName: string,
    conversationId: string,
    subject: string,
    message: string,
  ) {
    if (sender.role === 'business') {
      const title = `${businessName}: ${subject}`;
      const encryptedNotification = this.encryptedContent(
        title,
        message.trim(),
      );
      await client.query(
        `INSERT INTO communication_notifications
          (recipient_type, platform_admin_id, kind, priority, title, body,
           encrypted_content, source_type, source_id, action_url)
         SELECT 'platform-admin', id, 'business_message', 'important',
                '[encrypted]', '[encrypted]', $1,
                'conversation', $2::uuid,
                '/communication-center?tab=messages&conversation=' || $2::text
         FROM platform_admins`,
        [encryptedNotification, conversationId],
      );
      return;
    }
    const encryptedNotification = this.encryptedContent(
      subject,
      message.trim(),
    );
    await client.query(
      `INSERT INTO communication_notifications
        (recipient_type, business_id, kind, priority, title, body,
         encrypted_content, source_type, source_id, action_url)
       VALUES ('business', $1::uuid, 'platform_reply', 'important',
               '[encrypted]', '[encrypted]', $2,
               'conversation', $3::uuid, '/business/settings?tab=messages&conversation=' || $3::text)`,
      [businessId, encryptedNotification, conversationId],
    );
  }
}
