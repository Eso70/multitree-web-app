import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';
import { ApiKeyGuard } from './api-key.guard';
import { ApiScopeGuard } from './api-scope.guard';
import { ApiUsageInterceptor } from './api-usage.interceptor';
import { CurrentApiClient } from './current-api-client.decorator';
import type { ApiPrincipal } from './api-platform.types';
import { RequireApiScopes } from './require-api-scopes.decorator';
import { DeveloperApiService } from './developer-api.service';
import { IdempotencyService } from './idempotency.service';
import {
  BulkLinktreeDto,
  CloneLinktreeDto,
  DeveloperCreateLinktreeDto,
  DeveloperUpdateLinktreeDto,
  ScheduleLinktreeDto,
} from './dto/api-platform.dto';
import { StorageService } from '../storage/storage.service';
import { validateImageUpload } from '../storage/image-upload';
import { toText } from '../common/coerce';
import { SyncLinksDto } from '../links/dto/sync-links.dto';

@Controller('api/v1')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(ApiUsageInterceptor)
export class DeveloperApiController {
  constructor(
    private readonly service: DeveloperApiService,
    private readonly idempotency: IdempotencyService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  status(@CurrentApiClient() principal: ApiPrincipal) {
    return {
      success: true,
      data: {
        version: 'v1',
        clientId: principal.publicClientId,
        business: principal.businessName,
        environment: principal.environment,
      },
    };
  }

  @Get('linktrees')
  @RequireApiScopes('linktrees:read')
  async list(@CurrentApiClient() principal: ApiPrincipal) {
    return { success: true, data: await this.service.list(principal) };
  }

  @Post('linktrees')
  @RequireApiScopes('linktrees:write')
  async create(
    @Body() dto: DeveloperCreateLinktreeDto,
    @Headers('idempotency-key') key: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.idempotency.execute(
      principal,
      key,
      { operation: 'linktree.create', dto },
      () => this.service.create(dto, principal),
    );
    if (result.replayed) reply.header('Idempotency-Replayed', 'true');
    return { success: true, data: result.value };
  }

  @Get('linktrees/slug-availability')
  @RequireApiScopes('linktrees:read')
  async slug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.checkSlug(slug, principal, excludeId),
    };
  }

  @Post('linktrees/bulk')
  @RequireApiScopes('bulk:write')
  async bulk(
    @Body() dto: BulkLinktreeDto,
    @Headers('idempotency-key') key: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    const result = await this.idempotency.execute(
      principal,
      key,
      { operation: 'linktree.bulk', dto },
      () => this.service.bulk(dto, principal),
    );
    return {
      success: true,
      data: result.value,
      meta: { idempotencyReplayed: result.replayed },
    };
  }

  @Get('linktrees/:id')
  @RequireApiScopes('linktrees:read')
  async get(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return { success: true, data: await this.service.get(id, principal) };
  }

  @Patch('linktrees/:id')
  @RequireApiScopes('linktrees:write')
  async update(
    @Param('id') id: string,
    @Body() dto: DeveloperUpdateLinktreeDto,
    @Headers('idempotency-key') key: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    const result = await this.idempotency.execute(
      principal,
      key,
      { operation: 'linktree.update', id, dto },
      () => this.service.update(id, dto, principal),
    );
    return {
      success: true,
      data: result.value,
      meta: { idempotencyReplayed: result.replayed },
    };
  }

  @Delete('linktrees/:id')
  @RequireApiScopes('linktrees:delete')
  async remove(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return { success: true, data: await this.service.remove(id, principal) };
  }

  @Post('linktrees/:id/publish')
  @RequireApiScopes('linktrees:publish')
  async publish(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.setPublished(id, true, principal),
    };
  }

  @Post('linktrees/:id/unpublish')
  @RequireApiScopes('linktrees:publish')
  async unpublish(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.setPublished(id, false, principal),
    };
  }

  @Post('linktrees/:id/clone')
  @RequireApiScopes('linktrees:write', 'templates:read')
  async clone(
    @Param('id') id: string,
    @Body() dto: CloneLinktreeDto,
    @Headers('idempotency-key') key: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    const result = await this.idempotency.execute(
      principal,
      key,
      { operation: 'linktree.clone', id, dto },
      () => this.service.clone(id, dto, principal),
    );
    return {
      success: true,
      data: result.value,
      meta: { idempotencyReplayed: result.replayed },
    };
  }

  @Get('linktrees/:id/preview')
  @RequireApiScopes('linktrees:read')
  async preview(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return { success: true, data: await this.service.preview(id, principal) };
  }

  @Post('linktrees/:id/schedules')
  @RequireApiScopes('schedules:write')
  async schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleLinktreeDto,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.schedule(id, dto, principal),
    };
  }

  @Get('linktrees/:id/schedules')
  @RequireApiScopes('schedules:read')
  async schedules(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.listSchedules(id, principal),
    };
  }

  @Delete('schedules/:id')
  @RequireApiScopes('schedules:write')
  async cancelSchedule(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.cancelSchedule(id, principal),
    };
  }

  @Get('linktrees/:id/links')
  @RequireApiScopes('links:read')
  async links(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: (await this.service.get(id, principal)).links,
    };
  }

  @Put('linktrees/:id/links')
  @RequireApiScopes('links:manage')
  async syncLinks(
    @Param('id') id: string,
    @Body() body: SyncLinksDto,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.syncLinks(
        id,
        Array.isArray(body.links) ? body.links : [],
        principal,
      ),
    };
  }

  @Get('linktrees/:id/analytics')
  @RequireApiScopes('analytics:read')
  async analytics(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.analyticsSummary(id, principal),
    };
  }

  @Get('linktrees/:id/analytics/daily')
  @RequireApiScopes('analytics:read')
  async daily(
    @Param('id') id: string,
    @Query('days') days: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.analyticsDaily(
        id,
        Number(days || 30),
        principal,
      ),
    };
  }

  @Get('linktrees/:id/analytics/range')
  @RequireApiScopes('analytics:read')
  async range(
    @Param('id') id: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.analyticsRange(id, from, to, principal),
    };
  }

  @Get('linktrees/:id/analytics/export.csv')
  @RequireApiScopes('analytics:export')
  async exportAnalytics(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
    @Res() reply: FastifyReply,
  ) {
    const csv = await this.service.analyticsCsv(id, principal);
    return reply
      .type('text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="linktree-${id}-analytics.csv"`,
      )
      .send(csv);
  }

  @Get('templates')
  @RequireApiScopes('templates:read')
  async templates(@CurrentApiClient() principal: ApiPrincipal) {
    return { success: true, data: await this.service.templatesFor(principal) };
  }

  @Get('assets')
  @RequireApiScopes('assets:read')
  async assets(
    @Query('linktreeId') linktreeId: string | undefined,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.listAssets(principal, linktreeId),
    };
  }

  @Post('assets')
  @HttpCode(200)
  @RequireApiScopes('assets:write')
  async uploadAsset(
    @Req() request: FastifyRequest,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    const file = await request.file();
    if (!file) throw new Error('No file provided');
    const buffer = await file.toBuffer();
    const extension = validateImageUpload(buffer, file.mimetype);
    const fields = file.fields as Record<string, { value?: unknown }>;
    const assetType =
      toText(fields.assetType?.value, 'image')
        .replace(/[^a-z0-9_-]/gi, '')
        .slice(0, 40) || 'image';
    const linktreeId =
      typeof fields.linktreeId?.value === 'string'
        ? fields.linktreeId.value
        : undefined;
    const path = `businesses/${principal.businessId}/api-assets/${assetType}/${Date.now()}-${randomBytes(8).toString('hex')}.${extension}`;
    const url = await this.storage.uploadImage(buffer, path);
    return {
      success: true,
      data: await this.service.registerAsset(
        principal,
        url,
        assetType,
        linktreeId,
      ),
    };
  }

  @Delete('assets/:id')
  @RequireApiScopes('assets:write')
  async deleteAsset(
    @Param('id') id: string,
    @CurrentApiClient() principal: ApiPrincipal,
  ) {
    return {
      success: true,
      data: await this.service.deleteAsset(id, principal),
    };
  }
}
