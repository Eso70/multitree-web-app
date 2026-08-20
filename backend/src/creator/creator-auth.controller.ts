import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';
import { Subdomain } from '../auth/subdomain.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { SessionService, type SessionUser } from '../auth/session.service';
import { requestIp } from '../common/request-context';
import { CreatorAuthService } from './creator-auth.service';
import { CreatorAccountService } from './creator-account.service';
import { CreatorGuard } from './creator.guard';
import { StartCreatorGoogleAuthDto } from './dto/creator-auth.dto';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';

function secureRequest(request: FastifyRequest): boolean {
  return (
    String(request.headers['x-forwarded-proto'] || '').split(',')[0] ===
      'https' || request.protocol === 'https'
  );
}

@Controller('api/creator/auth')
export class CreatorAuthController {
  constructor(
    private readonly auth: CreatorAuthService,
    private readonly accounts: CreatorAccountService,
    private readonly sessions: SessionService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  @Get('google/start')
  @HttpCode(HttpStatus.FOUND)
  async startGoogle(
    @Query() query: StartCreatorGoogleAuthDto,
    @Subdomain() subdomain: string,
    @Req() request: FastifyRequest,
    @Res() response: FastifyReply,
  ) {
    this.assertRoot(subdomain);
    const ipAddress = requestIp(request);
    await this.accessRules.assertAllowed(ipAddress);
    const deviceToken =
      request.cookies?.creator_device || randomBytes(32).toString('base64url');
    if (!request.cookies?.creator_device) {
      response.setCookie('creator_device', deviceToken, {
        httpOnly: true,
        secure: secureRequest(request),
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });
    }
    return response.redirect(
      await this.auth.beginGoogleAuth({
        intent: query.intent,
        ipAddress,
        deviceToken,
      }),
      HttpStatus.FOUND,
    );
  }

  @Get('session')
  @UseGuards(CreatorGuard)
  async session(@CurrentUser() user: SessionUser) {
    const profile = await this.accounts.profile(user.id);
    if (!profile)
      throw new UnauthorizedException('Creator account unavailable');
    return { authenticated: true, user: profile };
  }

  @Post('logout')
  @UseGuards(CreatorGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: SessionUser,
    @Req() request: FastifyRequest & { sessionToken?: string },
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    if (request.sessionToken) {
      await this.sessions.destroySession(request.sessionToken, user);
    }
    response.setCookie('creator_session', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: secureRequest(request),
      sameSite: 'lax',
      path: '/',
    });
    return { success: true };
  }

  private assertRoot(subdomain: string) {
    if (subdomain && subdomain !== 'www') {
      throw new UnauthorizedException(
        'Creator accounts are available only on the main domain',
      );
    }
  }
}
