import {
  Controller,
  Delete,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseInterceptors,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import { StorageService } from '../storage/storage.service';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.service';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as crypto from 'crypto';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuditEvent } from '../auth/audit-event.decorator';
import { UpdateTemplateSettingsDto } from './dto/update-template-settings.dto';
import { validateImageUpload } from '../storage/image-upload';
import {
  RunDataRetentionDto,
  RunMediaCleanupDto,
  UpdateDataRetentionDto,
  UpdateMediaSettingsDto,
  UpdatePlatformBrandingDto,
  UpdatePlatformProfileDto,
  UpdatePlatformTikTokDto,
} from './dto/platform-settings.dto';
import { DataRetentionService } from './data-retention.service';

@Controller('api/platform/settings')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class PlatformSettingsController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly storageService: StorageService,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  @Get('tiktok')
  @RequireCapabilities(Capability.PlatformSettingsTikTokRead)
  async getTikTokSettings() {
    return {
      success: true,
      data: await this.platformSettingsService.getTikTokSettings(),
    };
  }

  @Put('tiktok')
  @RequireCapabilities(Capability.PlatformSettingsTikTokUpdate)
  @AuditEvent('platform.settings.tiktok.update', {
    resourceType: 'platform-settings',
  })
  async updateTikTokSettings(@Body() body: UpdatePlatformTikTokDto) {
    return {
      success: true,
      data: await this.platformSettingsService.updateTikTokSettings(
        body.tiktok_configs,
      ),
    };
  }

  @Get('tiktok/health')
  @RequireCapabilities(Capability.PlatformSettingsTikTokRead)
  async getTikTokHealth() {
    return {
      success: true,
      data: await this.platformSettingsService.getTikTokHealth(),
    };
  }

  @Get('tiktok/errors')
  @RequireCapabilities(Capability.PlatformSettingsTikTokRead)
  async getTikTokErrors() {
    return {
      success: true,
      data: await this.platformSettingsService.getTikTokErrors(),
    };
  }

  @Post('tiktok/retry-failed')
  @RequireCapabilities(Capability.PlatformSettingsTikTokUpdate)
  @AuditEvent('platform.settings.tiktok.retry-failed', {
    resourceType: 'platform-settings',
  })
  async retryFailedTikTokEvents() {
    return {
      success: true,
      data: {
        retried: await this.platformSettingsService.retryFailedTikTokEvents(),
      },
    };
  }

  @Get('media')
  @RequireCapabilities(Capability.PlatformSettingsRead)
  async getMediaSettings() {
    return { success: true, data: await this.storageService.getMediaStatus() };
  }

  @Put('media')
  @RequireCapabilities(Capability.PlatformSettingsMediaUpdate)
  @AuditEvent('platform.settings.media.update', {
    resourceType: 'platform-settings',
  })
  async updateMediaSettings(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdateMediaSettingsDto,
  ) {
    return {
      success: true,
      data: await this.storageService.updateMediaPolicy(user.id, body),
    };
  }

  @Post('media/cleanup')
  @RequireCapabilities(Capability.PlatformSettingsMediaCleanup)
  @AuditEvent('platform.settings.media.cleanup', {
    resourceType: 'platform-settings',
  })
  async cleanupMedia(@Body() body: RunMediaCleanupDto) {
    if (!body.confirm)
      throw new BadRequestException('Cleanup confirmation is required');
    return {
      success: true,
      data: await this.storageService.cleanupUnusedAssets(true),
    };
  }

  @Get('data-retention')
  @RequireCapabilities(Capability.PlatformSettingsRead)
  async getDataRetention() {
    return { success: true, data: await this.dataRetentionService.getStatus() };
  }

  @Put('data-retention')
  @RequireCapabilities(Capability.PlatformSettingsRetentionUpdate)
  @AuditEvent('platform.settings.data-retention.update', {
    resourceType: 'platform-settings',
  })
  async updateDataRetention(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdateDataRetentionDto,
  ) {
    const policy = await this.dataRetentionService.updatePolicy(user.id, body);
    return { success: true, data: policy };
  }

  @Post('data-retention/run')
  @RequireCapabilities(Capability.PlatformSettingsRetentionRun)
  @AuditEvent('platform.settings.data-retention.run', {
    resourceType: 'platform-settings',
  })
  async runDataRetention(
    @CurrentUser() user: SessionUser,
    @Body() body: RunDataRetentionDto,
  ) {
    const data = await this.dataRetentionService.runManual(
      user.id,
      body.confirm,
    );
    return { success: true, data };
  }

  @Get()
  @RequireCapabilities(Capability.PlatformSettingsRead)
  async getSettings(@CurrentUser() user: SessionUser) {
    const data = await this.platformSettingsService.getProfile(user.id);
    return { success: true, data };
  }

  @Put('profile')
  @RequireCapabilities(Capability.PlatformSettingsProfileUpdate)
  @AuditEvent('platform.settings.profile.update', {
    resourceType: 'platform-settings',
  })
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdatePlatformProfileDto,
  ) {
    const data = await this.platformSettingsService.updateProfile(
      user.id,
      body,
    );
    return { success: true, data };
  }

  @Get('sessions')
  @RequireCapabilities(Capability.PlatformSettingsRead)
  async getLoginSecurity(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
  ) {
    const data = await this.platformSettingsService.getLoginSecurity(
      user.id,
      request.sessionToken || '',
    );
    return { success: true, data };
  }

  @Delete('sessions')
  @RequireCapabilities(Capability.PlatformSettingsSessionsRevoke)
  @AuditEvent('platform.settings.sessions.revoke-others', {
    resourceType: 'session',
  })
  async revokeOtherSessions(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
  ) {
    const count = await this.platformSettingsService.revokeOtherSessions(
      user.id,
      request.sessionToken || '',
    );
    return { success: true, data: { revoked: count } };
  }

  @Delete('sessions/:sessionId')
  @RequireCapabilities(Capability.PlatformSettingsSessionsRevoke)
  @AuditEvent('platform.settings.session.revoke', {
    resourceType: 'session',
    resourceIdParam: 'sessionId',
  })
  async revokeSession(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
    @Param('sessionId') sessionId: string,
  ) {
    await this.platformSettingsService.revokeSession(
      user.id,
      sessionId,
      request.sessionToken || '',
    );
    return { success: true };
  }

  @Put('branding')
  @RequireCapabilities(Capability.PlatformSettingsBrandingUpdate)
  @AuditEvent('platform.settings.branding.update', {
    resourceType: 'platform-settings',
  })
  @HttpCode(HttpStatus.OK)
  async updateBranding(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdatePlatformBrandingDto,
  ) {
    const data = await this.platformSettingsService.updateBranding(
      user.id,
      body,
    );
    return { success: true, data };
  }

  @Post('branding/upload')
  @RequireCapabilities(Capability.PlatformSettingsBrandingUpdate)
  @AuditEvent('platform.settings.branding.upload', {
    resourceType: 'platform-settings',
  })
  @HttpCode(HttpStatus.OK)
  async uploadBrandingAsset(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    const data = await request.file();
    if (!data) {
      return response.status(400).send({ message: 'No file provided' });
    }

    const field = data.fields?.assetType as { value?: unknown } | undefined;
    const assetType =
      typeof field?.value === 'string' &&
      ['logo', 'avatar', 'favicon'].includes(field.value)
        ? field.value
        : null;
    if (!assetType) {
      return response.status(400).send({ message: 'Invalid asset type' });
    }

    const fileBuffer = await data.toBuffer();
    const extension = validateImageUpload(fileBuffer, data.mimetype);
    const filename = `${assetType}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
    const url = await this.storageService.uploadImage(
      fileBuffer,
      `multitree/branding/${user.id}/${assetType}/${filename}`,
    );

    return response.send({ success: true, data: { url } });
  }

  @Get('stats')
  @RequireCapabilities(Capability.PlatformSettingsStatsRead)
  async getMultiTreeStats() {
    const data = await this.platformSettingsService.getStats();
    return { success: true, data };
  }

  @Post('flush-cache')
  @RequireCapabilities(Capability.PlatformSettingsCacheFlush)
  @AuditEvent('platform.cache.clear', { resourceType: 'cache' })
  @HttpCode(HttpStatus.OK)
  async flushCache() {
    await this.platformSettingsService.flushCache();
    return { success: true, message: 'Cache flushed successfully' };
  }

  @Get('templates')
  @RequireCapabilities(Capability.PlatformTemplatesRead)
  async getTemplateSettings() {
    return {
      success: true,
      data: await this.platformSettingsService.getTemplateSettings(),
    };
  }

  @Put('templates/:templateKey')
  @RequireCapabilities(Capability.PlatformTemplatesGlobalUpdate)
  @AuditEvent('platform.template.settings.update', {
    resourceType: 'template',
    resourceIdParam: 'templateKey',
  })
  async updateTemplateSettings(
    @Req() request: FastifyRequest<{ Params: { templateKey: string } }>,
    @Body() body: UpdateTemplateSettingsDto,
  ) {
    const data = await this.platformSettingsService.updateTemplateSettings(
      request.params.templateKey,
      body.widget_config || {},
    );
    return { success: true, data };
  }
}
