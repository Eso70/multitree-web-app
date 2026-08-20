import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { analyticsRequestContext } from '../common/request-context';
import { RedisService } from '../redis/redis.service';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { Subdomain } from '../auth/subdomain.decorator';
import type { SessionUser } from '../auth/session.service';
import { StorageService } from '../storage/storage.service';
import { SaveMiniWebsiteDto } from './dto/mini-website.dto';
import { SubmitMiniWebsiteLeadDto } from './dto/mini-website-lead.dto';
import { extractCoordinatesFromMapUrl, resolveShortMapLink } from './map-link';
import { MiniWebsiteLeadsService } from './mini-website-leads.service';
import { MiniWebsitesService } from './mini-websites.service';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';
import { requestIp } from '../common/request-context';
import { uploadMiniWebsiteImage } from './mini-website-image-upload';

@Controller('api/mini-websites')
@UseGuards(BusinessGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class MiniWebsitesController {
  constructor(
    private readonly service: MiniWebsitesService,
    private readonly storage: StorageService,
  ) {}

  @Get('check-slug')
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessLinktreesRead,
  )
  async checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.isSlugAvailable(business.id, slug, excludeId),
    };
  }

  /**
   * Expands a shortened map link into coordinates.
   *
   * Google's Share button produces `maps.app.goo.gl` links whose destination is
   * only known to Google, and the browser cannot follow them cross-origin — so
   * the server does it. Restricted to known map hosts; see `map-link.ts`.
   */
  @Get('resolve-map-link')
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessLinktreesRead,
  )
  async resolveMapLink(@Query('url') url: string) {
    const direct = extractCoordinatesFromMapUrl(url || '');
    if (direct) return { success: true, data: direct };
    return { success: true, data: await resolveShortMapLink(url || '') };
  }

  @Get()
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessLinktreesRead,
  )
  async list(@CurrentUser() business: SessionUser) {
    return { success: true, data: await this.service.list(business.id) };
  }

  @Get(':id')
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessLinktreesRead,
  )
  async get(@Param('id') id: string, @CurrentUser() business: SessionUser) {
    return { success: true, data: await this.service.get(id, business.id) };
  }

  @Post()
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessMiniWebsitesCreate,
  )
  @AuditEvent('business.mini-website.create', { resourceType: 'mini-website' })
  async create(
    @Body() data: SaveMiniWebsiteDto,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.create(data, business.id),
    };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.BusinessPagesMiniWebsitesAccess)
  @AuditEvent('business.mini-website.update', {
    resourceType: 'mini-website',
    resourceIdParam: 'id',
  })
  async update(
    @Param('id') id: string,
    @Body() data: SaveMiniWebsiteDto,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.update(id, data, business.id),
    };
  }

  @Delete(':id')
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessLinktreesDelete,
  )
  @AuditEvent('business.mini-website.delete', {
    resourceType: 'mini-website',
    resourceIdParam: 'id',
  })
  async remove(@Param('id') id: string, @CurrentUser() business: SessionUser) {
    return await this.service.remove(id, business.id);
  }

  @Get(':id/analytics')
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessAnalyticsTotalsRead,
  )
  async analytics(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.analytics(id, business.id),
    };
  }

  @Delete(':id/analytics')
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessAnalyticsClearLinktree,
  )
  @AuditEvent('business.mini-website.analytics.clear', {
    resourceType: 'mini-website',
    resourceIdParam: 'id',
  })
  async clearAnalytics(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
  ) {
    return await this.service.clearAnalytics(id, business.id);
  }

  @Post('upload/image')
  @HttpCode(HttpStatus.OK)
  @RequireCapabilities(
    Capability.BusinessPagesMiniWebsitesAccess,
    Capability.BusinessLinktreesUpload,
  )
  @AuditEvent('business.mini-website.asset.upload', { resourceType: 'asset' })
  async upload(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() business: SessionUser,
  ) {
    const data = await req.file();
    if (!data) return res.status(400).send({ error: 'No file provided' });
    const url = await uploadMiniWebsiteImage(
      data,
      this.storage,
      business.id,
      'businesses',
    );
    return res.send({ success: true, data: { url }, url });
  }
}

@Controller('api/public/mini-websites')
export class PublicMiniWebsitesController {
  constructor(
    private readonly service: MiniWebsitesService,
    private readonly leads: MiniWebsiteLeadsService,
    private readonly redis: RedisService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  @Get()
  async list(@Subdomain() subdomain: string, @Req() request: FastifyRequest) {
    if (!subdomain) throw new NotFoundException('Not Found');
    await this.accessRules.assertForBusinessSubdomain(
      requestIp(request),
      subdomain,
    );
    return {
      success: true,
      data: await this.service.listBySubdomain(subdomain),
    };
  }

  @Get(':subdomain/:slug')
  async get(
    @Param('subdomain') subdomain: string,
    @Param('slug') slug: string,
    @Req() request: FastifyRequest,
  ) {
    await this.accessRules.assertForBusinessSubdomain(
      requestIp(request),
      subdomain,
    );
    return {
      success: true,
      data: await this.service.getPublic(subdomain, slug),
    };
  }

  @Get('platform/:slug')
  async getPlatform(
    @Param('slug') slug: string,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
  ) {
    if (subdomain && subdomain !== 'www') {
      throw new NotFoundException('Not Found');
    }
    await this.accessRules.assertAllowed(requestIp(request));
    return {
      success: true,
      data: await this.service.getPlatformPublic(slug),
    };
  }

  /**
   * Accepts one public submission of a page's lead form.
   *
   * Rate limited far more tightly than the analytics endpoint beside it: a page
   * view is something a visitor produces dozens of, while an enquiry is
   * something they send once. The limit is per address *and* page, so a shared
   * office network filling in two different businesses' forms is not stopped by
   * the first one.
   */
  @Post(':subdomain/:slug/leads')
  @HttpCode(HttpStatus.OK)
  async submitLead(
    @Param('subdomain') subdomain: string,
    @Param('slug') slug: string,
    @Body() body: SubmitMiniWebsiteLeadDto,
    @Req() request: FastifyRequest,
  ) {
    const context = analyticsRequestContext(request);
    await this.accessRules.assertForBusinessSubdomain(context.ip, subdomain);
    const scope = `${subdomain}:${slug}`.slice(0, 160).toLowerCase();
    if (
      await this.redis.isRateLimited(
        `rl:mini-lead:${context.ip}:${scope}`,
        5,
        600,
      )
    ) {
      throw new HttpException(
        {
          message: 'Too many submissions. Try again shortly.',
          retryAfter: 600,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return {
      success: true,
      data: await this.leads.submit(subdomain, slug, body, context),
    };
  }

  @Post('platform/:slug/leads')
  @HttpCode(HttpStatus.OK)
  async submitPlatformLead(
    @Param('slug') slug: string,
    @Subdomain() subdomain: string,
    @Body() body: SubmitMiniWebsiteLeadDto,
    @Req() request: FastifyRequest,
  ) {
    if (subdomain && subdomain !== 'www') {
      throw new NotFoundException('Not Found');
    }
    const context = analyticsRequestContext(request);
    await this.accessRules.assertAllowed(context.ip);
    if (
      await this.redis.isRateLimited(
        `rl:mini-lead:${context.ip}:platform:${slug}`.slice(0, 220),
        5,
        600,
      )
    ) {
      throw new HttpException(
        {
          message: 'Too many submissions. Try again shortly.',
          retryAfter: 600,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return {
      success: true,
      data: await this.leads.submitPlatform(
        await this.service.getRootOwnerId(slug),
        slug,
        body,
        context,
      ),
    };
  }
}
