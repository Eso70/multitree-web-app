import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { SaveMiniWebsiteDto } from '../mini-websites/dto/mini-website.dto';
import { uploadMiniWebsiteImage } from '../mini-websites/mini-website-image-upload';
import {
  extractCoordinatesFromMapUrl,
  resolveShortMapLink,
} from '../mini-websites/map-link';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { StorageService } from '../storage/storage.service';
import { PlatformMiniWebsitesService } from './platform-mini-websites.service';

@Controller('api/platform/mini-websites')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class PlatformMiniWebsitesController {
  constructor(
    private readonly miniWebsites: PlatformMiniWebsitesService,
    private readonly workspace: PlatformContentWorkspaceService,
    private readonly storage: StorageService,
  ) {}

  @Get('context')
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async context() {
    return { success: true, data: await this.miniWebsites.getContext() };
  }

  @Get('check-slug')
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return {
      success: true,
      data: await this.miniWebsites.isSlugAvailable(slug, excludeId),
    };
  }

  @Get('resolve-map-link')
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async resolveMapLink(@Query('url') url: string) {
    const direct = extractCoordinatesFromMapUrl(url || '');
    if (direct) return { success: true, data: direct };
    return { success: true, data: await resolveShortMapLink(url || '') };
  }

  @Get('analytics/summary')
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async analyticsSummary() {
    return {
      success: true,
      data: await this.miniWebsites.getAnalyticsSummary(),
    };
  }

  @Delete('analytics')
  @RequireCapabilities(Capability.PlatformMiniWebsitesDelete)
  @AuditEvent('platform.mini-website.analytics.clear-all', {
    resourceType: 'mini-website-analytics',
  })
  async clearAllAnalytics() {
    await this.miniWebsites.clearAllAnalytics();
    return { success: true };
  }

  @Get()
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async list() {
    return { success: true, data: await this.miniWebsites.list() };
  }

  @Get(':id')
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.miniWebsites.get(id) };
  }

  @Post()
  @RequireCapabilities(Capability.PlatformMiniWebsitesCreate)
  @AuditEvent('platform.mini-website.create', {
    resourceType: 'mini-website',
  })
  async create(@Body() data: SaveMiniWebsiteDto) {
    return { success: true, data: await this.miniWebsites.create(data) };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.PlatformMiniWebsitesUpdate)
  @AuditEvent('platform.mini-website.update', {
    resourceType: 'mini-website',
    resourceIdParam: 'id',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: SaveMiniWebsiteDto,
  ) {
    return { success: true, data: await this.miniWebsites.update(id, data) };
  }

  @Delete(':id')
  @RequireCapabilities(Capability.PlatformMiniWebsitesDelete)
  @AuditEvent('platform.mini-website.delete', {
    resourceType: 'mini-website',
    resourceIdParam: 'id',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.miniWebsites.remove(id);
    return { success: true };
  }

  @Get(':id/analytics')
  @RequireCapabilities(Capability.PlatformMiniWebsitesRead)
  async analytics(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.miniWebsites.getAnalytics(id) };
  }

  @Delete(':id/analytics')
  @RequireCapabilities(Capability.PlatformMiniWebsitesDelete)
  @AuditEvent('platform.mini-website.analytics.clear', {
    resourceType: 'mini-website',
    resourceIdParam: 'id',
  })
  async clearAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    await this.miniWebsites.clearAnalytics(id);
    return { success: true };
  }

  @Post('upload/image')
  @HttpCode(HttpStatus.OK)
  @RequireCapabilities(Capability.PlatformMiniWebsitesUpload)
  @AuditEvent('platform.mini-website.asset.upload', { resourceType: 'asset' })
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const data = await req.file();
    if (!data) return res.status(400).send({ error: 'No file provided' });
    const ownerId = await this.workspace.getWorkspaceId();
    const url = await uploadMiniWebsiteImage(
      data,
      this.storage,
      ownerId,
      'multitree',
    );
    return res.send({ success: true, data: { url }, url });
  }
}
