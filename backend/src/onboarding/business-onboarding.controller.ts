import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { BusinessOnboardingService } from './business-onboarding.service';
import {
  CreateSignupInvitationDto,
  ConsumeAuthHandoffDto,
  RequestEmailCodeDto,
  ReviewSignupApplicationDto,
  UpdateSignupApplicationDto,
  VerifyEmailCodeDto,
} from './dto/onboarding.dto';
import { Subdomain } from '../auth/subdomain.decorator';
import { requestIp } from '../common/request-context';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.service';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';
import { CreatorAuthService } from '../creator/creator-auth.service';

function secureRequest(request: FastifyRequest): boolean {
  return (
    String(request.headers['x-forwarded-proto'] || '').split(',')[0] ===
      'https' || request.protocol === 'https'
  );
}

@Controller('api/auth')
export class GoogleBusinessAuthController {
  constructor(
    private readonly onboarding: BusinessOnboardingService,
    private readonly creatorAuth: CreatorAuthService,
  ) {}

  @Get('google/start')
  @HttpCode(HttpStatus.FOUND)
  async startSignin(
    @Subdomain() subdomain: string,
    @Query('remember') remember: string | undefined,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    if (!subdomain)
      throw new UnauthorizedException('Business subdomain required');
    await this.onboarding.assertRateLimit(
      `signin:${subdomain}:${requestIp(request)}`,
      10,
      300,
    );
    return response.redirect(
      await this.onboarding.beginGoogleSignin(subdomain, remember === '1'),
      HttpStatus.FOUND,
    );
  }

  @Post('email/request')
  async requestEmailCode(
    @Body() body: RequestEmailCodeDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
  ) {
    if (!subdomain)
      throw new UnauthorizedException('Business subdomain required');
    await this.onboarding.assertRateLimit(
      `business-email-ip:${subdomain}:${requestIp(request)}`,
      10,
      15 * 60,
    );
    return this.onboarding.requestBusinessEmailCode(body.email, subdomain);
  }

  @Post('email/verify')
  async verifyEmailCode(
    @Body() body: VerifyEmailCodeDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    if (!subdomain)
      throw new UnauthorizedException('Business subdomain required');
    const session = await this.onboarding.verifyBusinessEmailCode({
      challengeId: body.challengeId,
      code: body.code,
      subdomain,
      ipAddress: requestIp(request),
      userAgent: request.headers['user-agent'] || '',
      rememberDevice: Boolean(body.rememberDevice),
    });
    response.setCookie('business_session', session.sessionToken, {
      httpOnly: true,
      secure: secureRequest(request),
      sameSite: 'lax',
      path: '/',
      maxAge: session.ttlSeconds,
    });
    return { authenticated: true, redirectUrl: '/business' };
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.FOUND)
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    if (subdomain)
      throw new UnauthorizedException('Invalid OAuth callback host');
    if (this.creatorAuth.isCreatorOAuthState(state)) {
      const creator = await this.creatorAuth.finishGoogleCallback(code, state, {
        ipAddress: requestIp(request),
        userAgent: request.headers['user-agent'] || '',
      });
      response.setCookie('creator_session', creator.sessionToken, {
        httpOnly: true,
        secure: secureRequest(request),
        sameSite: 'lax',
        path: '/',
        maxAge: creator.ttlSeconds,
      });
      return response.redirect(creator.redirectUrl, HttpStatus.FOUND);
    }
    const result = await this.onboarding.finishGoogleCallback(code, state, {
      ipAddress: requestIp(request),
      userAgent: request.headers['user-agent'] || '',
    });
    if (result.mode === 'signup') {
      response.setCookie('signup_session', result.sessionToken, {
        httpOnly: true,
        secure: secureRequest(request),
        sameSite: 'lax',
        path: '/',
        maxAge: 2 * 60 * 60,
      });
    }
    if (result.mode === 'platform-admin') {
      response.setCookie('platform_admin_session', result.sessionToken, {
        httpOnly: true,
        secure: secureRequest(request),
        sameSite: 'lax',
        path: '/',
        maxAge: result.ttlSeconds,
      });
    }
    return response.redirect(result.redirectUrl, HttpStatus.FOUND);
  }

  @Post('handoff')
  @HttpCode(HttpStatus.OK)
  async consumeHandoff(
    @Body() body: ConsumeAuthHandoffDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    if (!subdomain) throw new BadRequestException('Invalid handoff');
    await this.onboarding.assertRateLimit(
      `handoff:${subdomain}:${requestIp(request)}`,
      10,
      300,
    );
    const session = await this.onboarding.consumeHandoff({
      code: body.code,
      subdomain,
      ipAddress: requestIp(request),
      userAgent: request.headers['user-agent'] || '',
    });
    response.setCookie('business_session', session.sessionToken, {
      httpOnly: true,
      secure: secureRequest(request),
      sameSite: 'lax',
      path: '/',
      maxAge: session.ttlSeconds,
    });
    return { authenticated: true };
  }
}

@Controller('api/platform/auth')
export class PlatformGoogleAuthController {
  constructor(
    private readonly onboarding: BusinessOnboardingService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  @Get('google/start')
  @HttpCode(HttpStatus.FOUND)
  async start(
    @Subdomain() subdomain: string,
    @Query('remember') remember: string | undefined,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    if (subdomain) {
      throw new UnauthorizedException(
        'Platform administrator sign-in requires the root domain',
      );
    }
    const ipAddress = requestIp(request);
    await this.accessRules.assertAllowed(ipAddress, [
      { scope: 'platform_admin' },
    ]);
    await this.onboarding.assertRateLimit(
      `platform-google-signin:${ipAddress}`,
      5,
      300,
    );
    return response.redirect(
      await this.onboarding.beginPlatformAdminSignin(remember === '1'),
      HttpStatus.FOUND,
    );
  }

  @Post('email/request')
  async requestEmailCode(
    @Body() body: RequestEmailCodeDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
  ) {
    if (subdomain) {
      throw new UnauthorizedException(
        'Platform administrator sign-in requires the root domain',
      );
    }
    const ipAddress = requestIp(request);
    await this.accessRules.assertAllowed(ipAddress, [
      { scope: 'platform_admin' },
    ]);
    return this.onboarding.requestAdminEmailCode(body.email);
  }

  @Post('email/verify')
  async verifyEmailCode(
    @Body() body: VerifyEmailCodeDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    if (subdomain) {
      throw new UnauthorizedException(
        'Platform administrator sign-in requires the root domain',
      );
    }
    const session = await this.onboarding.verifyAdminEmailCode({
      challengeId: body.challengeId,
      code: body.code,
      ipAddress: requestIp(request),
      userAgent: request.headers['user-agent'] || '',
      rememberDevice: Boolean(body.rememberDevice),
    });
    response.setCookie('platform_admin_session', session.sessionToken, {
      httpOnly: true,
      secure: secureRequest(request),
      sameSite: 'lax',
      path: '/',
      maxAge: session.ttlSeconds,
    });
    return { authenticated: true, redirectUrl: session.redirectUrl };
  }
}

@Controller('api/signup')
export class BusinessSignupController {
  constructor(private readonly onboarding: BusinessOnboardingService) {}

  private assertRoot(subdomain: string) {
    if (subdomain)
      throw new UnauthorizedException(
        'Signup is available only on the main domain',
      );
  }

  @Get('invitation')
  async invitation(
    @Query('token') token: string,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
  ) {
    this.assertRoot(subdomain);
    await this.onboarding.assertRateLimit(
      `invite-check:${requestIp(request)}`,
      30,
      60,
    );
    return this.onboarding.validateInvitation(token);
  }

  @Get('google/start')
  @HttpCode(HttpStatus.FOUND)
  async startSignup(
    @Query('invite') invite: string,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    this.assertRoot(subdomain);
    await this.onboarding.assertRateLimit(
      `signup-start:${requestIp(request)}`,
      10,
      300,
    );
    return response.redirect(
      await this.onboarding.beginGoogleSignup(invite),
      HttpStatus.FOUND,
    );
  }

  @Post('email/request')
  async requestSignupEmailCode(
    @Body() body: RequestEmailCodeDto,
    @Query('invite') invite: string,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
  ) {
    this.assertRoot(subdomain);
    await this.onboarding.assertRateLimit(
      `signup-email-ip:${requestIp(request)}`,
      10,
      15 * 60,
    );
    return this.onboarding.requestSignupEmailCode(invite, body.email);
  }

  @Post('email/verify')
  async verifySignupEmailCode(
    @Body() body: VerifyEmailCodeDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    this.assertRoot(subdomain);
    const session = await this.onboarding.verifySignupEmailCode({
      challengeId: body.challengeId,
      code: body.code,
      ipAddress: requestIp(request),
      userAgent: request.headers['user-agent'] || '',
    });
    response.setCookie('signup_session', session.sessionToken, {
      httpOnly: true,
      secure: secureRequest(request),
      sameSite: 'lax',
      path: '/',
      maxAge: session.ttlSeconds,
    });
    return { authenticated: true, redirectUrl: session.redirectUrl };
  }

  @Get('application')
  async application(
    @Req() request: FastifyRequest,
    @Subdomain() subdomain: string,
  ) {
    this.assertRoot(subdomain);
    return this.onboarding.application(request.cookies?.signup_session || '');
  }

  @Patch('application')
  async update(
    @Body() body: UpdateSignupApplicationDto,
    @Req() request: FastifyRequest,
    @Subdomain() subdomain: string,
  ) {
    this.assertRoot(subdomain);
    return this.onboarding.updateApplication(
      request.cookies?.signup_session || '',
      body,
    );
  }

  @Post('application/submit')
  async submit(@Req() request: FastifyRequest, @Subdomain() subdomain: string) {
    this.assertRoot(subdomain);
    return this.onboarding.submitApplication(
      request.cookies?.signup_session || '',
    );
  }

  @Get('subdomain-availability')
  async subdomainAvailability(
    @Query('value') value: string,
    @Req() request: FastifyRequest,
    @Subdomain() subdomain: string,
  ) {
    this.assertRoot(subdomain);
    return this.onboarding.subdomainAvailable(
      request.cookies?.signup_session || '',
      value,
    );
  }
}

@Controller('api/platform/signup')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class PlatformSignupController {
  constructor(private readonly onboarding: BusinessOnboardingService) {}

  @Post('invitations')
  @RequireCapabilities(Capability.PlatformBusinessesCreate)
  @AuditEvent('platform.signup.invitation.create', {
    resourceType: 'signup-invitation',
  })
  async createInvitation(
    @CurrentUser() admin: SessionUser,
    @Body() body: CreateSignupInvitationDto,
  ) {
    return this.onboarding.createInvitation(admin.id, body.email);
  }

  @Get('applications')
  @RequireCapabilities(Capability.PlatformBusinessesRead)
  async applications() {
    return this.onboarding.listApplications();
  }

  @Patch('applications/:id')
  @RequireCapabilities(Capability.PlatformBusinessesCreate)
  @AuditEvent('platform.signup.application.review', {
    resourceType: 'signup-application',
    resourceIdParam: 'id',
  })
  async review(
    @Param('id') id: string,
    @CurrentUser() admin: SessionUser,
    @Body() body: ReviewSignupApplicationDto,
  ) {
    return this.onboarding.reviewApplication(id, admin.id, body);
  }
}
