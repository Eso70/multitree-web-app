import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  UseInterceptors,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import { Patch } from '@nestjs/common';
import { Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionService, type SessionUser } from './session.service';
import { BusinessGuard } from './business.guard';
import { AuthorizationGuard } from './authorization.guard';
import { Capability } from './capabilities';
import { RequireCapabilities } from './require-capabilities.decorator';
import { CurrentUser } from './current-user.decorator';
import { Subdomain } from './subdomain.decorator';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditInterceptor } from './audit.interceptor';
import { AuditEvent } from './audit-event.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthorizationService } from './authorization.service';
import type { PermissionKey } from './capabilities';
import { StorageService } from '../storage/storage.service';
import { validateImageUpload } from '../storage/image-upload';
import * as crypto from 'crypto';
import { requestIp } from '../common/request-context';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';
import {
  CompleteBusinessOnboardingDto,
  UpdateBusinessOnboardingDto,
} from './dto/business-onboarding.dto';
import { compactSettingsPayload } from './settings-payload';
import { ImpersonationService } from './impersonation.service';

@Controller('api/auth')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly accessRules: AccessRuleEnforcementService,
    private readonly impersonationService: ImpersonationService,
    @Optional() private readonly authorizationService?: AuthorizationService,
    @Optional() private readonly storageService?: StorageService,
  ) {}

  private firstHeader(value: string | string[] | undefined): string {
    const first = Array.isArray(value) ? value[0] : value;
    return typeof first === 'string' ? first.split(',')[0].trim() : '';
  }

  private async storeBusinessProfileAsset(
    req: FastifyRequest,
    user: SessionUser,
  ): Promise<{ url: string }> {
    if (!this.storageService) {
      throw new HttpException(
        'Storage is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const data = await req.file();
    if (!data) throw new BadRequestException('No file provided');
    const buffer = await data.toBuffer();
    const extension = validateImageUpload(buffer, data.mimetype);
    const field = data.fields?.assetType as { value?: unknown } | undefined;
    const rawType = typeof field?.value === 'string' ? field.value : '';
    const assetType = rawType.trim().toLowerCase();
    if (!['logo', 'favicon', 'default-avatar'].includes(assetType)) {
      throw new BadRequestException('Invalid asset type');
    }
    const filename = `${assetType}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
    const url = await this.storageService.uploadImage(
      buffer,
      `businesses/${user.id}/branding/${assetType}/${filename}`,
    );
    return { url };
  }

  @Post('logout')
  @UseGuards(BusinessGuard)
  @HttpCode(HttpStatus.OK)
  @AuditEvent('business.logout', { resourceType: 'session' })
  async logout(
    @Req() req: FastifyRequest & { sessionToken?: string },
    @Res({ passthrough: true }) res: FastifyReply,
    @CurrentUser() user: SessionUser,
  ) {
    const sessionToken = req.sessionToken;
    if (sessionToken && user) {
      await this.sessionService.destroySession(sessionToken, user);
    }

    const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
      .split(',')[0]
      .trim();
    const requestIsHttps =
      forwardedProto === 'https' || req.protocol === 'https';
    const cookieOptions = {
      expires: new Date(0),
      httpOnly: true,
      secure: requestIsHttps,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.setCookie('business_session', '', cookieOptions);

    return { message: 'Logged out successfully' };
  }

  @Get('session')
  @UseGuards(BusinessGuard)
  async getSession(@CurrentUser() user: SessionUser) {
    const business = await this.authService.getBusinessProfile(user.id);
    if (!business) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }
    return {
      authenticated: true,
      user: {
        id: business.id,
        username: business.username,
        name: business.name,
        phone: business.phone || null,
        email: business.email || null,
        ownerName: business.ownerName || null,
        logo: business.logo || null,
        favicon: business.favicon || null,
        default_avatar: business.default_avatar || null,
        website_color: business.website_color || '#000000',
        default_footer_text: business.default_footer_text || null,
        default_footer_phone: business.default_footer_phone || null,
        default_template: business.default_template || null,
        default_background_color: business.default_background_color || null,
        default_footer_hidden: business.default_footer_hidden ?? false,
        default_whatsapp_enabled: business.default_whatsapp_enabled ?? false,
        onboarding_required: !business.onboarding_completed_at,
        onboarding_step: business.onboarding_step ?? 1,
      },
      // Present only while a platform administrator is signed in as this
      // business. The dashboard uses it to render its permanent banner, so an
      // impersonated session can never be mistaken for the owner's own.
      impersonation: user.impersonation
        ? {
            platform_admin_name: user.impersonation.platformAdminName,
            started_at: user.impersonation.startedAt,
          }
        : null,
    };
  }

  /**
   * Ends an impersonated session from inside the tenant.
   *
   * Separate from `logout` so the audit trail distinguishes an administrator
   * releasing borrowed access from an owner signing themselves out, and so the
   * caller receives the console URL to return to.
   */
  @Post('impersonation/exit')
  @UseGuards(BusinessGuard)
  @HttpCode(HttpStatus.OK)
  async exitImpersonation(
    @Req() req: FastifyRequest & { sessionToken?: string },
    @Res({ passthrough: true }) res: FastifyReply,
    @CurrentUser() user: SessionUser,
  ) {
    const result = await this.impersonationService.end({
      sessionToken: req.sessionToken || '',
      user,
      context: {
        ipAddress: requestIp(req),
        userAgent: this.firstHeader(req.headers['user-agent']),
      },
    });

    const forwardedProto = this.firstHeader(req.headers['x-forwarded-proto']);
    res.setCookie('business_session', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: forwardedProto === 'https' || req.protocol === 'https',
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }

  @Get('onboarding')
  @UseGuards(BusinessGuard)
  async getOnboarding(@CurrentUser() user: SessionUser) {
    return { data: await this.authService.getBusinessOnboarding(user.id) };
  }

  @Patch('onboarding')
  @UseGuards(BusinessGuard)
  @AuditEvent('business.onboarding.update', { resourceType: 'business' })
  async updateOnboarding(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdateBusinessOnboardingDto,
  ) {
    return {
      data: await this.authService.updateBusinessOnboarding(user.id, body),
    };
  }

  @Post('onboarding/complete')
  @UseGuards(BusinessGuard)
  @AuditEvent('business.onboarding.complete', { resourceType: 'business' })
  async completeOnboarding(
    @CurrentUser() user: SessionUser,
    @Body() _body: CompleteBusinessOnboardingDto,
  ) {
    return {
      data: await this.authService.completeBusinessOnboarding(user.id),
    };
  }

  @Post('onboarding/assets')
  @UseGuards(BusinessGuard)
  @HttpCode(HttpStatus.OK)
  async uploadOnboardingAsset(
    @Req() req: FastifyRequest,
    @CurrentUser() user: SessionUser,
  ) {
    await this.authService.assertBusinessOnboardingPending(user.id);
    return this.storeBusinessProfileAsset(req, user);
  }

  @Get('profile')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessProfileRead)
  async getProfile(@CurrentUser() user: SessionUser) {
    const business = await this.authService.getBusinessProfile(user.id);
    if (!business) {
      throw new HttpException('Business not found', HttpStatus.NOT_FOUND);
    }
    const defaultsDecision = await this.authorizeOptional({
      principal: { id: user.id, type: 'business' },
      businessId: user.id,
      permission: Capability.BusinessDefaultsRead,
      context: { now: new Date() },
    });
    const defaultsAllowed = defaultsDecision.outcome !== 'deny';
    return {
      user: {
        id: business.id,
        username: business.username,
        name: business.name,
        phone: business.phone || null,
        email: business.email || null,
        ownerName: business.ownerName || null,
        logo: business.logo || null,
        favicon: business.favicon || null,
        default_avatar: business.default_avatar || null,
        website_color: business.website_color || '#000000',
        default_footer_text: defaultsAllowed
          ? business.default_footer_text || null
          : null,
        default_footer_phone: defaultsAllowed
          ? business.default_footer_phone || null
          : null,
        default_template: defaultsAllowed
          ? business.default_template || null
          : null,
        default_background_color: defaultsAllowed
          ? business.default_background_color || null
          : null,
        default_footer_hidden: defaultsAllowed
          ? (business.default_footer_hidden ?? false)
          : false,
        default_whatsapp_enabled: defaultsAllowed
          ? (business.default_whatsapp_enabled ?? false)
          : false,
      },
    };
  }

  @Get('settings')
  @UseGuards(BusinessGuard)
  async getSettings(@CurrentUser() user: SessionUser) {
    const permissions = await Promise.all(
      [
        Capability.BusinessProfileRead,
        Capability.BusinessDefaultsRead,
        Capability.BusinessTikTokRead,
      ].map((permission) =>
        this.requireAuthorization().authorize({
          principal: { id: user.id, type: 'business' },
          businessId: user.id,
          permission,
          context: { now: new Date() },
        }),
      ),
    );
    if (permissions.every((decision) => decision.outcome === 'deny')) {
      throw new HttpException(
        'Settings access is not included',
        HttpStatus.FORBIDDEN,
      );
    }
    const data = (await this.authService.getBusinessSettings(
      user.id,
    )) as Record<string, unknown>;
    if (permissions[1].outcome === 'deny') {
      for (const field of [
        'default_footer_text',
        'default_footer_phone',
        'default_template',
        'default_background_color',
        'default_footer_hidden',
        'default_whatsapp_enabled',
      ]) {
        delete data[field];
      }
    }
    if (permissions[2].outcome === 'deny') data.tiktok_configs = [];
    return { data };
  }

  @Get('template-access')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessTemplatesBrowse)
  async getTemplateAccess(@CurrentUser() user: SessionUser) {
    return { data: await this.authService.getBusinessTemplateAccess(user.id) };
  }

  @Get('sessions')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessSettingsSecurityAccess)
  async getSessions(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
  ) {
    return {
      success: true,
      data: await this.sessionService.getBusinessLoginSecurity(
        user.id,
        request.sessionToken || '',
      ),
    };
  }

  @Delete('sessions')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessSecuritySessionsRevoke)
  @AuditEvent('business.sessions.revoke-others', { resourceType: 'session' })
  async revokeOtherSessions(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
  ) {
    const revoked = await this.sessionService.revokeBusinessSessions(
      user.id,
      request.sessionToken || '',
    );
    return { success: true, data: { revoked } };
  }

  @Delete('sessions/:sessionId')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessSecuritySessionsRevoke)
  @AuditEvent('business.session.revoke', {
    resourceType: 'session',
    resourceIdParam: 'sessionId',
  })
  async revokeSession(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.revokeBusinessSession(
      user.id,
      sessionId,
      request.sessionToken || '',
    );
    return { success: true };
  }

  @Patch('settings')
  @UseGuards(BusinessGuard)
  @AuditEvent('business.settings.update', { resourceType: 'business' })
  async updateSettings(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdateSettingsDto,
  ) {
    const rawBody = compactSettingsPayload(
      body as unknown as Record<string, unknown>,
    );
    const section = typeof body.section === 'string' ? body.section : '';
    const changedFields = this.settingsChangedFields(section, rawBody);
    const permission = this.settingsPermission(section, changedFields);
    const decision = await this.requireAuthorization().authorize({
      principal: { id: user.id, type: 'business' },
      businessId: user.id,
      permission,
      changedFields,
      context: { now: new Date() },
    });
    // Settings changes are never queued for platform-administrator approval.
    // A profile edit applies immediately and then locks the whole profile
    // section for 30 days (`PROFILE_CHANGE_COOLDOWN_DAYS`), enforced in
    // `AuthService.updateBusinessSettings`. An `approval` outcome here would
    // otherwise still be reachable from a plan configuration that predates the
    // cooldown, so it is treated as allowed rather than trusted to be absent.
    if (decision.outcome !== 'allow' && decision.outcome !== 'approval') {
      throw new HttpException(
        { code: decision.reasonCode, decision },
        HttpStatus.FORBIDDEN,
      );
    }
    return {
      data: await this.authService.updateBusinessSettings(user.id, rawBody),
    };
  }

  @Get('effective-access')
  @UseGuards(BusinessGuard)
  async getEffectiveAccess(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.requireAuthorization().getEffectiveAccess(user.id),
    };
  }

  @Get('tiktok/:id/secret')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessTikTokSecretRead)
  async revealTikTokSecret(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.authService.getTikTokSecret(user.id, id),
    };
  }

  @Post('profile-assets/upload')
  @UseGuards(BusinessGuard, AuthorizationGuard)
  @RequireCapabilities(Capability.BusinessProfileAssetsUpload)
  @HttpCode(HttpStatus.OK)
  async uploadProfileAsset(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() user: SessionUser,
  ) {
    return res.send(await this.storeBusinessProfileAsset(req, user));
  }

  /**
   * Public endpoint: returns the website_color for a given subdomain.
   * Used by the login page to theme itself without requiring authentication.
   * Returns 404 if subdomain not found or inactive.
   */
  @Get('subdomain-theme/:subdomain')
  @HttpCode(HttpStatus.OK)
  async getSubdomainTheme(
    @Param('subdomain') subdomain: string,
    @Req() request?: FastifyRequest,
  ) {
    if (request) {
      await this.accessRules.assertForBusinessSubdomain(
        requestIp(request),
        subdomain,
      );
    }
    const theme = await this.authService.getSubdomainTheme(subdomain);
    if (!theme) {
      throw new HttpException('Subdomain not found', HttpStatus.NOT_FOUND);
    }
    return {
      website_color: theme.website_color || '#000000',
      name: theme.name || null,
      favicon: theme.favicon || null,
      logo: theme.logo || null,
    };
  }

  /**
   * Public endpoint: checks if a subdomain is registered to an active business.
   * Used by the Next.js middleware to block /business/* on unregistered subdomains.
   * Returns 200 { exists: true } if found, 404 if not.
   * No auth required — the response reveals nothing sensitive.
   */
  @Get('subdomain-check')
  @HttpCode(HttpStatus.OK)
  async checkSubdomain(
    @Subdomain() subdomain: string,
    @Req() request?: FastifyRequest,
  ) {
    if (!subdomain) {
      throw new HttpException('Subdomain not found', HttpStatus.NOT_FOUND);
    }
    if (request) {
      await this.accessRules.assertForBusinessSubdomain(
        requestIp(request),
        subdomain,
      );
    }
    const exists = await this.authService.subdomainExists(subdomain);
    if (!exists) {
      throw new HttpException('Subdomain not found', HttpStatus.NOT_FOUND);
    }
    return { exists: true };
  }

  private settingsPermission(
    section: string,
    changedFields?: string[],
  ): PermissionKey {
    if (
      section === 'profile' &&
      changedFields?.length === 1 &&
      changedFields[0] === 'username'
    ) {
      return Capability.BusinessSecurityUsernameUpdate;
    }
    if (section === 'profile') return Capability.BusinessProfileUpdate;
    if (section === 'defaults') return Capability.BusinessDefaultsUpdate;
    if (section === 'integrations') return Capability.BusinessTikTokUpdate;
    throw new HttpException('Invalid settings section', HttpStatus.BAD_REQUEST);
  }

  private requireAuthorization(): AuthorizationService {
    if (!this.authorizationService) {
      throw new Error('Authorization service is unavailable');
    }
    return this.authorizationService;
  }

  private async authorizeOptional(
    request: Parameters<AuthorizationService['authorize']>[0],
  ): Promise<Awaited<ReturnType<AuthorizationService['authorize']>>> {
    if (
      this.authorizationService &&
      typeof this.authorizationService.authorize === 'function'
    ) {
      return this.authorizationService.authorize(request);
    }
    return {
      outcome: 'allow',
      reasonCode: 'GRANTED',
      deniedFields: [],
      approvalFields: [],
      source: request.principal.type === 'business' ? 'plan' : 'platform-role',
    };
  }

  private settingsChangedFields(
    section: string,
    body: Record<string, unknown>,
  ): string[] | undefined {
    if (section === 'profile') {
      return Object.keys(body).filter((key) =>
        [
          'name',
          'username',
          'phone',
          'logo',
          'favicon',
          'default_avatar',
          'website_color',
        ].includes(key),
      );
    }
    if (section === 'defaults') {
      return Object.keys(body).filter((key) =>
        [
          'default_footer_text',
          'default_footer_phone',
          'default_template',
          'default_background_color',
          'default_footer_hidden',
          'default_whatsapp_enabled',
        ].includes(key),
      );
    }
    if (section === 'integrations') {
      return ['pixel_id', 'events_token'];
    }
    return undefined;
  }
}
