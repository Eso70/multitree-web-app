import { SetMetadata } from '@nestjs/common';

export const AUDIT_EVENT_METADATA = 'audit:event';

export interface AuditEventDefinition {
  eventType: string;
  resourceType?: string;
  resourceIdParam?: string;
  resourceLabelField?: string;
}

export function AuditEvent(
  eventType: string,
  options: Omit<AuditEventDefinition, 'eventType'> = {},
) {
  return SetMetadata(AUDIT_EVENT_METADATA, { eventType, ...options });
}
