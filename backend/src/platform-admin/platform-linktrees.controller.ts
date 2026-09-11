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
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { CreateLinktreeDto } from '../linktrees/dto/create-linktree.dto';
import { DuplicateLinktreeDto } from '../linktrees/dto/duplicate-linktree.dto';
import {
  ToggleLinktreeArchiveDto,
  ToggleLinktreeCampaignDto,
  ToggleLinktreeStatusDto,
} from '../linktrees/dto/update-linktree.dto';
import { uploadLinktreeImage } from '../linktrees/linktree-image-upload';
import { PlatformContentWorkspaceService } from '../platform-workspace/platform-content-workspace.service';
import { StorageService } from '../storage/storage.service';
import { PlatformLinktreesService } from './platform-linktrees.service';

@Controller('api/platform/linktrees')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
export class PlatformLinktreesController {
  constructor(
    private readonly platformLinktrees: PlatformLinktreesService,
    private readonly workspace: PlatformContentWorkspaceService,
    private readonly storage: StorageService,
  ) {}

  @Get('context')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async getContext() {
    return { success: true, data: await this.platformLinktrees.getContext() };
  }

  @Get('check-slug')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.isSlugAvailable(slug, excludeId),
    };
  }

  @Get('check-name')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async checkName(
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.isNameAvailable(name, excludeId),
    };
  }

  @Get()
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async list() {
    return { success: true, data: await this.platformLinktrees.list() };
  }

  @Get('analytics/summary')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async getAnalyticsSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.getAnalyticsSummary({ from, to }),
    };
  }

  @Get(':id/edit')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async getForEdit(@Param('id') id: string) {
    return {
      success: true,
      data: await this.platformLinktrees.getForEdit(id),
    };
  }

  @Get(':id/analytics')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.getAnalytics(id, { from, to }),
    };
  }

  @Get(':id/analytics/actions')
  @RequireCapabilities(Capability.PlatformLinktreesRead)
  async getAnalyticsActions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.getAnalyticsActions(id, { from, to }),
    };
  }

  @Post()
  @RequireCapabilities(Capability.PlatformLinktreesCreate)
  async create(@Body() body: CreateLinktreeDto) {
    return { success: true, data: await this.platformLinktrees.create(body) };
  }

  @Post(':id/duplicate')
  @RequireCapabilities(Capability.PlatformLinktreesCreate)
  async duplicate(@Param('id') id: string, @Body() body: DuplicateLinktreeDto) {
    return {
      success: true,
      data: await this.platformLinktrees.duplicate(id, body),
    };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.PlatformLinktreesUpdate)
  async update(@Param('id') id: string, @Body() body: CreateLinktreeDto) {
    return {
      success: true,
      data: await this.platformLinktrees.update(id, body),
    };
  }

  @Patch(':id/status')
  @RequireCapabilities(Capability.PlatformLinktreesUpdate)
  async toggleStatus(
    @Param('id') id: string,
    @Body() body: ToggleLinktreeStatusDto,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.toggleStatus(id, body.status),
    };
  }

  @Patch(':id/campaign-status')
  @RequireCapabilities(Capability.PlatformLinktreesUpdate)
  async toggleCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ToggleLinktreeCampaignDto,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.toggleCampaign(
        id,
        body.is_campaign_active,
      ),
    };
  }

  @Patch(':id/archive')
  @RequireCapabilities(Capability.PlatformLinktreesUpdate)
  async toggleArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ToggleLinktreeArchiveDto,
  ) {
    return {
      success: true,
      data: await this.platformLinktrees.toggleArchive(id, body.is_archived),
    };
  }

  @Delete('analytics')
  @RequireCapabilities(Capability.PlatformLinktreesDelete)
  async clearAllAnalytics() {
    await this.platformLinktrees.clearAllAnalytics();
    return { success: true };
  }

  @Delete(':id')
  @RequireCapabilities(Capability.PlatformLinktreesDelete)
  async delete(@Param('id') id: string) {
    await this.platformLinktrees.delete(id);
    return { success: true, message: 'Platform Linktree deleted successfully' };
  }

  @Delete(':id/analytics')
  @RequireCapabilities(Capability.PlatformLinktreesDelete)
  async clearAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    await this.platformLinktrees.clearAnalytics(id);
    return { success: true };
  }

  @Post('upload')
  @RequireCapabilities(Capability.PlatformLinktreesUpload)
  @HttpCode(HttpStatus.OK)
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const data = await req.file();
    if (!data) return res.status(400).send({ error: 'No file provided' });
    const ownerId = await this.workspace.getWorkspaceId();
    const url = await uploadLinktreeImage(
      data,
      this.storage,
      ownerId,
      'sponsor_krd',
    );
    return res.send({ url });
  }
}
