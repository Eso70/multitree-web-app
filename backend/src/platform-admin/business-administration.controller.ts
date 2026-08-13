import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import {
  BusinessAdministrationService,
  type LinktreeBackup,
} from './business-administration.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UpdateTikTokDto } from './dto/update-tiktok.dto';
import { ProfileChangeReviewDto } from './dto/profile-change-review.dto';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { StorageService } from '../storage/storage.service';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { validateImageUpload } from '../storage/image-upload';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuditEvent } from '../auth/audit-event.decorator';
import { SessionService, type SessionUser } from '../auth/session.service';
import { BusinessListQueryDto } from '../common/dto/admin-list-query.dto';
import { ImpersonationService } from '../auth/impersonation.service';
import { StartImpersonationDto } from './dto/start-impersonation.dto';
import { requestIp } from '../common/request-context';

@Controller('api/platform/businesses')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class BusinessAdministrationController {
  constructor(
    private readonly businessAdministrationService: BusinessAdministrationService,
    private readonly storageService: StorageService,
    private readonly sessionService: SessionService,
    private readonly impersonationService: ImpersonationService,
  ) {}

  private firstHeaderValue(value: string | string[] | undefined): string {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === 'string' ? first.split(',')[0].trim() : '';
  }

  private getMultipartField(
    data: Awaited<ReturnType<FastifyRequest['file']>>,
    name: string,
  ): string | undefined {
    const field = data?.fields?.[name] as { value?: unknown } | undefined;
    return typeof field?.value === 'string' ? field.value : undefined;
  }

  private cleanPathSegment(
    value: string | undefined,
    fallback: string,
  ): string {
    const cleaned = (value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || fallback;
  }

  @Get()
  @RequireCapabilities(Capability.PlatformBusinessesProfileRequestsRead)
  async getAllBusinesses(@Query() query: BusinessListQueryDto) {
    return {
      success: true,
      data: await this.businessAdministrationService.getBusinesses(query),
    };
  }

  @Get('profile-change-requests/pending')
  @RequireCapabilities(Capability.PlatformBusinessesProfileRequestsRead)
  async getPendingProfileChangeRequests() {
    return {
      success: true,
      data: await this.businessAdministrationService.getPendingProfileChangeRequests(),
    };
  }

  @Get('options')
  @RequireCapabilities(Capability.PlatformBusinessesRead)
  async getBusinessOptions(@Query() query: BusinessListQueryDto) {
    return {
      success: true,
      data: await this.businessAdministrationService.getBusinessOptions(query),
    };
  }

  @Get(':id')
  @RequireCapabilities(Capability.PlatformBusinessesRead)
  async getBusiness(@Param('id') id: string) {
    return {
      success: true,
      data: await this.businessAdministrationService.getBusiness(id),
    };
  }

  @Patch('profile-change-requests/:businessId')
  @RequireCapabilities(Capability.PlatformBusinessesProfileRequestsReview)
  @AuditEvent('platform.business.profile_request.review', {
    resourceType: 'business',
    resourceIdParam: 'businessId',
  })
  async reviewProfileChangeRequest(
    @Param('businessId') businessId: string,
    @Body() body: ProfileChangeReviewDto,
  ) {
    return {
      success: true,
      data: await this.businessAdministrationService.reviewProfileChangeRequest(
        businessId,
        body.action,
      ),
    };
  }

  @Post('upload')
  @RequireCapabilities(Capability.PlatformBusinessesAssetsUpload)
  @AuditEvent('platform.asset.upload', { resourceType: 'asset' })
  @HttpCode(HttpStatus.OK)
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const data = await req.file();
    if (!data) {
      return res.status(400).send({ error: 'No file provided' });
    }

    const fileBuffer = await data.toBuffer();
    const extension = validateImageUpload(fileBuffer, data.mimetype);
    const scope = this.cleanPathSegment(
      this.getMultipartField(data, 'scope'),
      'business',
    );
    const businessKey = this.cleanPathSegment(
      this.getMultipartField(data, 'businessKey'),
      '_pending',
    );
    const assetType = this.cleanPathSegment(
      this.getMultipartField(data, 'assetType'),
      'misc',
    );

    // Generate filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const baseName = data.filename.split('.').slice(0, -1).join('.') || 'image';
    const sanitizedBaseName = baseName
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    const filename = `${sanitizedBaseName}-${timestamp}-${random}.${extension}`;
    const folder =
      scope === 'multitree'
        ? `multitree/branding/${assetType}`
        : `businesses/${businessKey}/branding/${assetType}`;
    const storagePath = `${folder}/${filename}`;

    const url = await this.storageService.uploadImage(fileBuffer, storagePath);

    return res.send({ url });
  }

  @Get(':id/sessions')
  @RequireCapabilities(Capability.PlatformBusinessesRead)
  async getBusinessSessions(@Param('id') id: string) {
    return {
      success: true,
      data: await this.sessionService.getBusinessLoginSecurity(id),
    };
  }

  @Delete(':id/sessions')
  @RequireCapabilities(Capability.PlatformBusinessesSessionsRevoke)
  @AuditEvent('platform.business.sessions.revoke-all', {
    resourceType: 'business',
    resourceIdParam: 'id',
  })
  async revokeBusinessSessions(@Param('id') id: string) {
    const revoked = await this.sessionService.revokeBusinessSessions(id);
    return { success: true, data: { revoked } };
  }

  @Delete(':id/sessions/:sessionId')
  @RequireCapabilities(Capability.PlatformBusinessesSessionsRevoke)
  @AuditEvent('platform.business.session.revoke', {
    resourceType: 'business',
    resourceIdParam: 'id',
  })
  async revokeBusinessSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.revokeBusinessSession(id, sessionId);
    return { success: true };
  }

  /**
   * Mints a single-use handoff that opens this business's dashboard as the
   * business. The administrator never receives a tenant credential: the code
   * is exchanged for a host-only session cookie by the tenant's own consume
   * endpoint, and the administrator's root-domain console session is left
   * intact so exiting returns to it.
   */
  // No `@AuditEvent` here: `ImpersonationService` is the single owner of this
  // action's audit trail. It records every outcome, including the rejections
  // that never reach a handler result, with the target subdomain and support
  // reason a generic route event cannot carry.
  @Post(':id/impersonation')
  @RequireCapabilities(Capability.PlatformBusinessesImpersonate)
  @HttpCode(HttpStatus.OK)
  async startImpersonation(
    @Param('id') id: string,
    @Body() dto: StartImpersonationDto,
    @Req() req: FastifyRequest & { user?: SessionUser },
  ) {
    const admin = req.user;
    if (!admin) {
      throw new BadRequestException('Platform administrator session required');
    }
    return {
      success: true,
      data: await this.impersonationService.start({
        businessId: id,
        admin: { id: admin.id, name: admin.name || admin.username },
        reason: dto.reason ?? null,
        context: {
          ipAddress: requestIp(req),
          userAgent: this.firstHeaderValue(req.headers['user-agent']),
        },
      }),
    };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.PlatformBusinessesUpdate)
  @AuditEvent('platform.business.update', {
    resourceType: 'business',
    resourceIdParam: 'id',
  })
  async updateBusiness(
    @Param('id') id: string,
    @Body() updateDto: UpdateBusinessDto,
  ) {
    const business = await this.businessAdministrationService.updateBusiness(
      id,
      updateDto,
    );
    return { success: true, data: business };
  }

  @Delete(':id')
  @RequireCapabilities(Capability.PlatformBusinessesDelete)
  @AuditEvent('platform.business.delete', {
    resourceType: 'business',
    resourceIdParam: 'id',
  })
  async deleteBusiness(@Param('id') id: string) {
    await this.businessAdministrationService.deleteBusiness(id);
    return { success: true, message: 'Business deleted successfully' };
  }

  @Get(':id/linktrees')
  @RequireCapabilities(Capability.PlatformBusinessesLinktreesRead)
  async getBusinessLinktrees(@Param('id') id: string) {
    const linktrees =
      await this.businessAdministrationService.getBusinessLinktrees(id);
    return { success: true, data: linktrees };
  }

  @Get(':id/linktrees-export')
  @RequireCapabilities(Capability.PlatformBusinessesLinktreesExport)
  async exportBusinessLinktrees(
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ) {
    const backup =
      await this.businessAdministrationService.exportBusinessLinktrees(id);
    const safeName =
      backup.business.username.replace(/[^a-z0-9_-]/gi, '-') || 'business';
    return res
      .header('Content-Type', 'application/json; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="${safeName}-linktrees.multitree.json"`,
      )
      .send(JSON.stringify(backup, null, 2));
  }

  @Post(':id/linktrees-import')
  @RequireCapabilities(Capability.PlatformBusinessesLinktreesImport)
  @AuditEvent('platform.business.linktrees.import', {
    resourceType: 'business',
    resourceIdParam: 'id',
  })
  @HttpCode(HttpStatus.OK)
  async importBusinessLinktrees(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file();
    if (!data) return { success: false, message: 'No backup file provided' };
    const raw = (await data.toBuffer()).toString('utf8');
    let backup: unknown;
    try {
      backup = JSON.parse(raw);
    } catch {
      throw new BadRequestException('The selected file is not valid JSON');
    }
    const result =
      await this.businessAdministrationService.importBusinessLinktrees(
        id,
        backup as LinktreeBackup,
      );
    return { success: true, data: result };
  }

  @Post(':id/tiktok')
  @RequireCapabilities(Capability.PlatformBusinessesTikTokUpdate)
  @AuditEvent('platform.business.tiktok.update', {
    resourceType: 'business',
    resourceIdParam: 'id',
  })
  @HttpCode(HttpStatus.OK)
  async updateTikTok(@Param('id') id: string, @Body() body: UpdateTikTokDto) {
    const business =
      await this.businessAdministrationService.updateTikTokConfig(
        id,
        body.pixel_id,
        body.events_token,
        body.tiktok_configs,
      );
    return { success: true, data: business };
  }
}
