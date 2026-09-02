import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requestIp } from '../common/request-context';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { ClientLinktreeAccessService } from './client-linktree-access.service';
import {
  ClientLinktreeSessionGuard,
  type ClientLinktreeRequest,
} from './client-linktree-session.guard';
import { ExchangeClientLinktreeInvitationDto } from './dto/exchange-client-linktree-invitation.dto';
import { StorageService } from '../storage/storage.service';
import { uploadLinktreeImage } from '../linktrees/linktree-image-upload';

const COOKIE_NAME = 'client_linktree_session';
const COOKIE_PATH = '/api/client-linktree-access';

@Controller('api/client-linktree-access')
export class ClientLinktreeAccessController {
  constructor(
    private readonly access: ClientLinktreeAccessService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body() body: ExchangeClientLinktreeInvitationDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const result = await this.access.exchange(
      body.token,
      body.pin,
      this.context(request),
    );
    response.setCookie(COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: COOKIE_PATH,
      expires: result.expiresAt,
    });
    return { success: true, data: { expiresAt: result.expiresAt } };
  }

  @Get('session')
  @UseGuards(ClientLinktreeSessionGuard)
  async session(@Req() request: ClientLinktreeRequest) {
    return {
      success: true,
      data: await this.access.sessionContext(request.clientLinktreeSession!),
    };
  }

  @Get('check-slug')
  @UseGuards(ClientLinktreeSessionGuard)
  async checkSlug(
    @Query('slug') slug: string,
    @Req() request: ClientLinktreeRequest,
  ) {
    return {
      success: true,
      data: await this.access.checkSlug(request.clientLinktreeSession!, slug),
    };
  }

  @Get('check-name')
  @UseGuards(ClientLinktreeSessionGuard)
  async checkName(
    @Query('name') name: string,
    @Req() request: ClientLinktreeRequest,
  ) {
    return {
      success: true,
      data: await this.access.checkName(request.clientLinktreeSession!, name),
    };
  }

  @Get('analytics')
  @UseGuards(ClientLinktreeSessionGuard)
  async analytics(@Req() request: ClientLinktreeRequest) {
    return {
      success: true,
      data: await this.access.analytics(request.clientLinktreeSession!),
    };
  }

  @Get('analytics/summary')
  @UseGuards(ClientLinktreeSessionGuard)
  async analyticsSummary(@Req() request: ClientLinktreeRequest) {
    return {
      success: true,
      data: await this.access.analyticsSummary(request.clientLinktreeSession!),
    };
  }

  @Get('analytics/actions')
  @UseGuards(ClientLinktreeSessionGuard)
  async analyticsActions(@Req() request: ClientLinktreeRequest) {
    return {
      success: true,
      data: await this.access.analyticsActions(request.clientLinktreeSession!),
    };
  }

  @Post('upload')
  @UseGuards(ClientLinktreeSessionGuard)
  @HttpCode(HttpStatus.OK)
  async upload(
    @Req() request: ClientLinktreeRequest,
    @Res() response: FastifyReply,
  ) {
    const session = request.clientLinktreeSession!;
    const context = this.context(request);
    await this.access.assertUploadAllowed(session, context);
    const data = await request.file();
    if (!data) throw new BadRequestException('No file provided');
    const url = await uploadLinktreeImage(
      data,
      this.storage,
      session.businessId,
      'businesses',
    );
    await this.access.recordUpload(session, context);
    return response.send({ url });
  }

  @Post('submit')
  @UseGuards(ClientLinktreeSessionGuard)
  async submit(
    @Body() body: CreateLinktreeDto,
    @Req() request: ClientLinktreeRequest,
  ) {
    const data = await this.access.submit(
      request.clientLinktreeSession!,
      body,
      this.context(request),
    );
    return { success: true, data };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: FastifyReply): void {
    this.clearCookie(response);
  }

  private clearCookie(response: FastifyReply): void {
    response.setCookie(COOKIE_NAME, '', {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: COOKIE_PATH,
      expires: new Date(0),
    });
  }

  private context(request: FastifyRequest) {
    return {
      ipAddress: requestIp(request),
      userAgent: String(request.headers['user-agent'] || ''),
      requestId: String(request.id || ''),
    };
  }
}
