import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { SessionService } from './session.service';
import type { SessionUser } from './session.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { CurrentUser } from './current-user.decorator';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditInterceptor } from './audit.interceptor';
import { AuditEvent } from './audit-event.decorator';

@Controller('api/platform/auth')
@UseInterceptors(AuditInterceptor)
export class PlatformAuthController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('profile')
  @UseGuards(PlatformAdminGuard)
  getProfile(@CurrentUser() user: SessionUser) {
    return { user: { id: user.id, username: user.username, name: user.name } };
  }

  @Get('effective-access')
  @UseGuards(PlatformAdminGuard)
  getEffectiveAccess() {
    return { success: true, data: { unrestricted: true } };
  }

  @Post('logout')
  @UseGuards(PlatformAdminGuard)
  @HttpCode(HttpStatus.OK)
  @AuditEvent('platform_admin.logout', { resourceType: 'session' })
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

    res.setCookie('platform_admin_session', '', {
      expires: new Date(0),
      httpOnly: true,
      secure: requestIsHttps,
      sameSite: 'strict',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }
}
