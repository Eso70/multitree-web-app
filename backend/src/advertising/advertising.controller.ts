import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { Subdomain } from '../auth/subdomain.decorator';
import type { SessionUser } from '../auth/session.service';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';
import { requestIp } from '../common/request-context';
import { StorageService } from '../storage/storage.service';
import { validateImageUpload } from '../storage/image-upload';
import { AdvertisingService } from './advertising.service';
import { SaveAdvertisingDto } from './dto/advertising.dto';

/**
 * The business's own editor. Every handler resolves the page from the session,
 * never from a client-supplied business id, so there is no identifier to forge.
 */
@Controller('api/advertising')
@UseGuards(BusinessGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class AdvertisingController {
  constructor(
    private readonly service: AdvertisingService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingRead,
  )
  async get(@CurrentUser() business: SessionUser) {
    return { success: true, data: await this.service.getDraft(business.id) };
  }

  @Patch()
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingUpdate,
  )
  @AuditEvent('business.advertising.update', { resourceType: 'advertising' })
  async save(
    @Body() patch: SaveAdvertisingDto,
    @CurrentUser() business: SessionUser,
  ) {
    return { success: true, data: await this.service.save(business.id, patch) };
  }

  /**
   * What the Ads tab's Save button calls.
   *
   * Saving is publishing on this page, and the two must not be able to land
   * apart, so they share one request and one transaction. `PATCH` and
   * `POST /publish` remain separately available for API consumers that want
   * to stage a draft. Requires the publish capability as well as update,
   * because that is what it does.
   */
  @Post('save-and-publish')
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingUpdate,
    Capability.BusinessAdvertisingPublish,
  )
  @AuditEvent('business.advertising.publish', { resourceType: 'advertising' })
  async saveAndPublish(
    @Body() patch: SaveAdvertisingDto,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.saveAndPublish(business.id, patch),
    };
  }

  @Post('publish')
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingPublish,
  )
  @AuditEvent('business.advertising.publish', { resourceType: 'advertising' })
  async publish(@CurrentUser() business: SessionUser) {
    return { success: true, data: await this.service.publish(business.id) };
  }

  @Post('unpublish')
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingPublish,
  )
  @AuditEvent('business.advertising.unpublish', { resourceType: 'advertising' })
  async unpublish(@CurrentUser() business: SessionUser) {
    return { success: true, data: await this.service.unpublish(business.id) };
  }

  @Get('versions')
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingRead,
  )
  async versions(@CurrentUser() business: SessionUser) {
    return {
      success: true,
      data: await this.service.listVersions(business.id),
    };
  }

  @Post('versions/:version/restore')
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingPublish,
  )
  @AuditEvent('business.advertising.restore', { resourceType: 'advertising' })
  async restore(
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.restoreVersion(business.id, version),
    };
  }

  /**
   * Images only, validated by magic bytes rather than the declared MIME type.
   * There is no video counterpart: `platform_media_settings` allows jpeg, png
   * and ico, so the code-extraction video is referenced by URL instead.
   */
  @Post('upload/image')
  @RequireCapabilities(
    Capability.BusinessPagesAdvertisingAccess,
    Capability.BusinessAdvertisingUpdate,
  )
  @AuditEvent('business.advertising.asset.upload', { resourceType: 'asset' })
  async upload(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() business: SessionUser,
  ) {
    const data = await req.file();
    if (!data) return res.status(400).send({ error: 'No file provided' });
    const buffer = await data.toBuffer();
    const extension = validateImageUpload(buffer, data.mimetype);
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const base = (data.filename.split('.').slice(0, -1).join('.') || 'image')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase();
    const url = await this.storage.uploadImage(
      buffer,
      `businesses/${business.id}/advertising/${base}-${timestamp}-${random}.${extension}`,
    );
    await this.storage.claimBusinessAssets(business.id, url);
    return res.send({ success: true, data: { url }, url });
  }
}

/**
 * The visitor's read, resolved by subdomain like the other public endpoints.
 *
 * A page that is not published 404s rather than returning content with a flag,
 * so unpublished copy never reaches a browser.
 */
@Controller('api/public/advertising')
export class PublicAdvertisingController {
  constructor(
    private readonly service: AdvertisingService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  @Get()
  async get(@Subdomain() subdomain: string, @Req() request?: FastifyRequest) {
    if (!subdomain) {
      throw new NotFoundException('Not Found');
    }
    if (request) {
      await this.accessRules.assertForBusinessSubdomain(
        requestIp(request),
        subdomain,
      );
    }
    const config = await this.service.getPublishedBySubdomain(subdomain);
    if (!config) {
      throw new NotFoundException('Not Found');
    }
    return { success: true, data: config };
  }
}
