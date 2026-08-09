import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditFilterOptionsQueryDto } from './dto/audit-filter-options-query.dto';

@Controller('api/platform/audit-events')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequireCapabilities(Capability.PlatformAuditList)
  async getPage(@Query() query: AuditLogQueryDto) {
    return { success: true, data: await this.auditLogService.getPage(query) };
  }

  @Get('export')
  @RequireCapabilities(Capability.PlatformAuditExport)
  @AuditEvent('platform.audit.export', { resourceType: 'audit-log' })
  async export(
    @Query() query: AuditLogQueryDto,
    @Res() response: FastifyReply,
  ) {
    const rows = await this.auditLogService.getExportRows(query);
    const header = [
      'id',
      'kind',
      'created_at',
      'outcome',
      'event_type',
      'actor_type',
      'actor',
      'resource_type',
      'resource_id',
      'resource',
      'business',
      'ip_address',
      'request_id',
      'source',
      'http_method',
      'request_path',
      'status_code',
      'duration_ms',
      'user_agent',
      'metadata',
    ];
    const lines = rows.map((row) =>
      [
        row.id,
        row.kind,
        row.createdAt,
        row.outcome,
        row.eventType,
        row.actorType,
        row.actorLabel,
        row.resourceType,
        row.resourceId,
        row.resourceLabel,
        row.businessLabel,
        row.ipAddress,
        row.requestId,
        row.source,
        row.httpMethod,
        row.requestPath,
        row.statusCode,
        row.durationMs,
        row.userAgent,
        JSON.stringify(row.metadata),
      ]
        .map((value) => this.csv(value))
        .join(','),
    );
    const date = new Date().toISOString().slice(0, 10);
    return response
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="multitree-audit-${date}.csv"`,
      )
      .send(`\uFEFF${header.join(',')}\n${lines.join('\n')}`);
  }

  @Get('filter-options')
  @RequireCapabilities(Capability.PlatformAuditFiltersRead)
  async getFilterOptions(@Query() query: AuditFilterOptionsQueryDto) {
    return {
      success: true,
      data: await this.auditLogService.getFilterOptions(query.businessId),
    };
  }

  @Get(':auditId')
  @RequireCapabilities(Capability.PlatformAuditDetail)
  async getOne(@Param('auditId') auditId: string) {
    return {
      success: true,
      data: await this.auditLogService.getOne(auditId),
    };
  }

  private csv(value: string | number | boolean | null | undefined): string {
    const text = value == null ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }
}
