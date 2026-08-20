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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Subdomain } from '../auth/subdomain.decorator';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { uploadLinktreeImage } from '../linktrees/linktree-image-upload';
import { SaveMiniWebsiteDto } from '../mini-websites/dto/mini-website.dto';
import { uploadMiniWebsiteImage } from '../mini-websites/mini-website-image-upload';
import {
  extractCoordinatesFromMapUrl,
  resolveShortMapLink,
} from '../mini-websites/map-link';
import { StorageService } from '../storage/storage.service';
import { CreatorContentService } from './creator-content.service';
import { CreatorGuard, type CreatorRequest } from './creator.guard';

@Controller('api/creator')
@UseGuards(CreatorGuard)
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

  @Get('linktrees/check-slug')
  checkLinktreeSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.content.slugAvailable('linktree', slug || '', excludeId);
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

  @Delete('linktrees/analytics')
  async clearAllLinktreeAnalytics(@Req() request: CreatorRequest) {
    await this.content.clearAnalytics(this.businessId(request), 'linktree');
    return { success: true };
  }

  @Get('linktrees/:id/analytics')
  linktreeAnalytics(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.content.analyticsSummary(
      this.businessId(request),
      'linktree',
      id,
    );
  }

  @Delete('linktrees/:id/analytics')
  async clearLinktreeAnalytics(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.content.clearAnalytics(this.businessId(request), 'linktree', id);
    return { success: true };
  }

  @Delete('linktrees/:id')
  async deleteLinktree(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.content.deleteLinktree(id, this.businessId(request));
    return { success: true };
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

  @Get('mini-websites/check-slug')
  checkMiniWebsiteSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.content.slugAvailable('mini_website', slug || '', excludeId);
  }

  @Get('mini-websites/resolve-map-link')
  async resolveMapLink(@Query('url') url: string) {
    const direct = extractCoordinatesFromMapUrl(url || '');
    return direct || resolveShortMapLink(url || '');
  }

  @Get('mini-websites/analytics/summary')
  miniWebsiteAnalyticsSummary(@Req() request: CreatorRequest) {
    return this.content.analyticsSummary(
      this.businessId(request),
      'mini_website',
    );
  }

  @Delete('mini-websites/analytics')
  async clearAllMiniWebsiteAnalytics(@Req() request: CreatorRequest) {
    await this.content.clearAnalytics(this.businessId(request), 'mini_website');
    return { success: true };
  }

  @Get('mini-websites')
  listMiniWebsites(@Req() request: CreatorRequest) {
    return this.content.listMiniWebsites(this.businessId(request));
  }

  @Get('mini-websites/:id')
  getMiniWebsite(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.content.getMiniWebsite(id, this.businessId(request));
  }

  @Post('mini-websites')
  createMiniWebsite(
    @Req() request: CreatorRequest,
    @Body() data: SaveMiniWebsiteDto,
  ) {
    return this.content.createMiniWebsite(data, this.businessId(request));
  }

  @Patch('mini-websites/:id')
  updateMiniWebsite(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: SaveMiniWebsiteDto,
  ) {
    return this.content.updateMiniWebsite(id, data, this.businessId(request));
  }

  @Delete('mini-websites/:id')
  async deleteMiniWebsite(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.content.deleteMiniWebsite(id, this.businessId(request));
    return { success: true };
  }

  @Get('mini-websites/:id/analytics')
  miniWebsiteAnalytics(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.content.analyticsSummary(
      this.businessId(request),
      'mini_website',
      id,
    );
  }

  @Delete('mini-websites/:id/analytics')
  async clearMiniWebsiteAnalytics(
    @Req() request: CreatorRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.content.clearAnalytics(
      this.businessId(request),
      'mini_website',
      id,
    );
    return { success: true };
  }

  @Post('mini-websites/upload/image')
  @HttpCode(HttpStatus.OK)
  async uploadMiniWebsite(
    @Req() request: CreatorRequest,
    @Res() response: FastifyReply,
  ) {
    this.assertWritable(request);
    const data = await request.file();
    if (!data) return response.status(400).send({ error: 'No file provided' });
    const url = await uploadMiniWebsiteImage(
      data,
      this.storage,
      this.businessId(request),
      'businesses',
    );
    return response.send({ success: true, data: { url }, url });
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
