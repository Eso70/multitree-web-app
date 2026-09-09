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
  Put,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Subdomain } from '../auth/subdomain.decorator';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { UpdateTikTokPixelConfigsDto } from '../auth/dto/update-tiktok-pixel-config.dto';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { ToggleLinktreeStatusDto } from '../linktrees/dto/update-linktree.dto';
import { uploadLinktreeImage } from '../linktrees/linktree-image-upload';
import { StorageService } from '../storage/storage.service';
import { CreatorContentService } from './creator-content.service';
import { CreatorGuard, type CreatorRequest } from './creator.guard';
import { requestIp } from '../common/request-context';
import { TestTikTokEventsApiDto } from '../analytics/dto/test-tiktok-events-api.dto';

@Controller('api/creator')
@UseGuards(CreatorGuard)
@UseInterceptors(AuditInterceptor)
export class CreatorContentController {
  constructor(
    private readonly content: CreatorContentService,
    private readonly storage: StorageService,
  ) {}

  @Get('context')
  context(@Req() request: CreatorRequest, @Subdomain() subdomain: string) {
    this.assertRoot(subdomain);
    return this.content.context(this.businessId(request));
  }

  @Get('settings/tiktok')
  getTikTokSettings(@Req() request: CreatorRequest) {
    return this.content.getTikTokSettings(this.businessId(request));
  }

  @Put('settings/tiktok')
  @AuditEvent('creator.settings.tiktok.update', {
    resourceType: 'creator-settings',
  })
  updateTikTokSettings(
    @Req() request: CreatorRequest,
    @Body() body: UpdateTikTokPixelConfigsDto,
  ) {
    this.assertWritable(request);
    return this.content.updateTikTokSettings(
      this.businessId(request),
      body.tiktok_configs,
    );
  }

  @Get('settings/tiktok/health')
  getTikTokHealth(@Req() request: CreatorRequest) {
    return this.content.getTikTokHealth(this.businessId(request));
  }

  @Get('settings/tiktok/:id/secret')
  async getTikTokSecret(
    @Param('id') id: string,
    @Req() request: CreatorRequest,
  ) {
    this.assertWritable(request);
    return {
      success: true,
      data: await this.content.getTikTokSecret(this.businessId(request), id),
    };
  }

  @Get('settings/tiktok/errors')
  getTikTokErrors(@Req() request: CreatorRequest) {
    return this.content.getTikTokErrors(this.businessId(request));
  }

  @Post('settings/tiktok/test')
  testTikTok(
    @Req() request: CreatorRequest,
    @Body() body: TestTikTokEventsApiDto,
  ) {
    return this.content.testTikTok(this.businessId(request), body, {
      ip: requestIp(request),
      userAgent: request.headers['user-agent'],
    });
  }

  @Get('linktrees/check-slug')
  checkLinktreeSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.content.slugAvailable(slug || '', excludeId);
  }

  @Get('linktrees/check-name')
  checkLinktreeName(
    @Req() request: CreatorRequest,
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.content.nameAvailable(
      this.businessId(request),
      name || '',
      excludeId,
    );
  }

  @Get('linktrees')
  listLinktrees(@Req() request: CreatorRequest) {
    return this.content.listLinktrees(this.businessId(request));
  }

  @Get('linktrees/:id/edit')
  getLinktree(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.content.getLinktree(id, this.businessId(request));
  }

  @Post('linktrees')
  createLinktree(
    @Req() request: CreatorRequest,
    @Body() data: CreateLinktreeDto,
  ) {
    return this.content.createLinktree(data, this.businessId(request));
  }

  @Patch('linktrees/:id')
  updateLinktree(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateLinktreeDto,
  ) {
    return this.content.updateLinktree(id, data, this.businessId(request));
  }

  @Patch('linktrees/:id/status')
  toggleLinktreeStatus(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ToggleLinktreeStatusDto,
  ) {
    return this.content.toggleLinktreeStatus(
      id,
      body.status,
      this.businessId(request),
    );
  }

  @Delete('linktrees/analytics')
  async clearAllLinktreeAnalytics(@Req() request: CreatorRequest) {
    await this.content.clearAnalytics(this.businessId(request));
    return { success: true };
  }

  @Get('linktrees/:id/analytics')
  linktreeAnalytics(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.content.analyticsSummary(this.businessId(request), id);
  }

  @Get('linktrees/:id/analytics/actions')
  linktreeAnalyticsActions(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.content.pageActions(this.businessId(request), id);
  }

  @Delete('linktrees/:id/analytics')
  async clearLinktreeAnalytics(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.content.clearAnalytics(this.businessId(request), id);
    return { success: true };
  }

  @Delete('linktrees/:id')
  deleteLinktree(@Param('id', ParseUUIDPipe) _id: string) {
    return this.content.denyPageDeletion();
  }

  @Post('linktrees/upload')
  @HttpCode(HttpStatus.OK)
  async uploadLinktree(
    @Req() request: CreatorRequest,
    @Res() response: FastifyReply,
  ) {
    this.assertWritable(request);
    const data = await request.file();
    if (!data) return response.status(400).send({ error: 'No file provided' });
    const url = await uploadLinktreeImage(
      data,
      this.storage,
      this.businessId(request),
      'businesses',
    );
    return response.send({ url });
  }

  private businessId(request: CreatorRequest) {
    if (!request.creator) throw new UnauthorizedException();
    return request.creator.businessId;
  }

  private assertWritable(request: CreatorRequest) {
    if (!request.creator?.canWrite) {
      throw new UnauthorizedException('Creator account is read-only');
    }
  }

  private assertRoot(subdomain: string) {
    if (subdomain) {
      throw new UnauthorizedException(
        'Creator accounts are available only on the main domain',
      );
    }
  }
}
