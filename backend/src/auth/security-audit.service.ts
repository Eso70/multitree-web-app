import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type SecurityActorType =
  'anonymous' | 'business' | 'creator' | 'platform-admin' | 'multitree';
export type SecurityOutcome = 'success' | 'failure' | 'denied';

export interface SecurityAuditEvent {
  actorType: SecurityActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  businessId?: string | null;
  eventType: string;
  outcome: SecurityOutcome;
  resourceType?: string | null;
  resourceId?: string | null;
  resourceLabel?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async record(event: SecurityAuditEvent): Promise<void> {
    try {
      await this.databaseService.query(
        `INSERT INTO security_audit_events (
           actor_type, actor_id, actor_label, business_id, event_type, outcome,
           resource_type, resource_id, resource_label, request_id,
           ip_address, user_agent, metadata
         ) VALUES (
           $1, $2::uuid, $3, $4::uuid, $5, $6,
           $7, $8, $9, $10, $11::inet, $12, $13::jsonb
         )`,
        [
          event.actorType,
          event.actorId || null,
          normalizeAuditLabel(event.actorLabel),
          event.businessId || null,
          event.eventType,
          event.outcome,
          normalizeAuditLabel(event.resourceType, 60),
          normalizeAuditLabel(event.resourceId, 100),
          normalizeAuditLabel(event.resourceLabel),
          normalizeAuditLabel(event.requestId, 100),
          normalizeAuditIp(event.ipAddress),
          event.userAgent || null,
          JSON.stringify(event.metadata || {}),
        ],
      );
    } catch (error) {
      // Audit persistence must not turn a valid login/logout into an outage.
      // The database error is still visible to operators.
      this.logger.warn(
        `Failed to persist ${event.eventType} audit event: ${(error as Error).message}`,
      );
    }
  }
}

function normalizeAuditLabel(
  value?: string | null,
  maxLength = 200,
): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeAuditIp(value?: string | null): string | null {
  if (!value) return null;
  const first = value
    .split(',')[0]
    ?.trim()
    .replace(/%.*$/, '')
    .replace(/^"|"$/g, '');
  if (!first || first === 'unknown' || first === 'localhost') return null;
  if (
    (/^[0-9a-fA-F:.]+$/.test(first) && first.includes(':')) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(first)
  ) {
    return first;
  }
  return null;
}
