import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { LinktreesService } from './linktrees.service';
import { LinksService } from '../links/links.service';
import { BatchSyncLinksDto } from '../links/dto/sync-links.dto';
import { CreateLinktreeDto } from './dto/create-linktree.dto';
import { UpdateLinktreeDto } from './dto/update-linktree.dto';
import { BusinessGuard } from '../auth/business.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.service';
import { StorageService } from '../storage/storage.service';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuditEvent } from '../auth/audit-event.decorator';
import { uploadLinktreeImage } from './linktree-image-upload';

@Controller('api/linktrees')
@UseGuards(BusinessGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class LinktreesController {
  constructor(
    private readonly linktreesService: LinktreesService,
    private readonly linksService: LinksService,
    private readonly storageService: StorageService,
  ) {}

  @Get('check-slug')
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async checkSlug(
    @Query('slug') slug: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.linktreesService.isSlugAvailable(
        business.id,
        slug,
        excludeId,
      ),
    };
  }

  @Get('check-name')
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async checkName(
    @Query('name') name: string,
    @Query('excludeId') excludeId: string | undefined,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.linktreesService.isNameAvailable(
        business.id,
        name,
        excludeId,
      ),
    };
  }

  @Get()
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async getAll(@CurrentUser() business: SessionUser) {
    const linktrees = await this.linktreesService.getAllLinktrees(business.id);
    return { success: true, data: linktrees };
  }

  @Get(':id/edit')
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async getForEdit(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
  ) {
    const linktree = await this.linktreesService.getLinktreeById(
      id,
      business.id,
    );
    // Fetch associated links
    const linksResult = await this.linktreesService.getLinktreeLinks(
      id,
      business.id,
    );
    return { success: true, data: { linktree, links: linksResult } };
  }

  @Get('default')
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async getDefault(@CurrentUser() business: SessionUser) {
    const linktree = await this.linktreesService.getDefaultLinktree(
      business.id,
    );
    return { success: true, data: linktree };
  }

  @Post('default')
  @RequireCapabilities(Capability.BusinessLinktreesCreate)
  @AuditEvent('business.linktree.default.create', { resourceType: 'linktree' })
  async createDefault(@CurrentUser() business: SessionUser) {
    const linktree = await this.linktreesService.createDefaultLinktree(
      business.id,
    );
    return { success: true, data: linktree };
  }

  @Get(':id')
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async getOne(@Param('id') id: string, @CurrentUser() business: SessionUser) {
    const linktree = await this.linktreesService.getLinktreeById(
      id,
      business.id,
    );
    return { success: true, data: linktree };
  }

  @Post()
  @RequireCapabilities(Capability.BusinessLinktreesCreate)
  @AuditEvent('business.linktree.create', { resourceType: 'linktree' })
  async create(
    @Body() createDto: CreateLinktreeDto,
    @CurrentUser() business: SessionUser,
  ) {
    const linktree = await this.linktreesService.createLinktree(
      createDto,
      business.id,
    );
    return { success: true, data: linktree };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.BusinessLinktreesUpdate)
  @AuditEvent('business.linktree.update', {
    resourceType: 'linktree',
    resourceIdParam: 'id',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLinktreeDto,
    @CurrentUser() business: SessionUser,
  ) {
    const linktree = await this.linktreesService.updateLinktree(
      id,
      updateDto,
      business.id,
    );
    return { success: true, data: linktree };
  }

  @Delete(':id')
  @RequireCapabilities(Capability.BusinessLinktreesDelete)
  @AuditEvent('business.linktree.delete', {
    resourceType: 'linktree',
    resourceIdParam: 'id',
  })
  async delete(@Param('id') id: string, @CurrentUser() business: SessionUser) {
    await this.linktreesService.deleteLinktree(id, business.id);
    return { success: true, message: 'Linktree deleted successfully' };
  }

  @Get(':id/links')
  @RequireCapabilities(Capability.BusinessLinksRead)
  async getLinks(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
  ) {
    const links = await this.linksService.getLinksByLinktree(id, business.id);
    return { success: true, data: links };
  }

  @Post(':id/links/batch')
  @RequireCapabilities(Capability.BusinessLinksSync)
  @HttpCode(HttpStatus.OK)
  @AuditEvent('business.linktree.links.sync', {
    resourceType: 'linktree',
    resourceIdParam: 'id',
  })
  async batchLinks(
    @Param('id') id: string,
    @Body() body: BatchSyncLinksDto,
    @CurrentUser() business: SessionUser,
  ) {
    // Support both formats: { links: [...] } or { createLinks: [...], deleteIds: [...] }
    const linksToSync = body.links || body.createLinks || [];
    await this.linksService.syncLinks(id, linksToSync, business.id);
    const links = await this.linksService.getLinksByLinktree(id, business.id);
    return { success: true, data: links };
  }

  @Post('upload')
  @RequireCapabilities(Capability.BusinessLinktreesUpload)
  @HttpCode(HttpStatus.OK)
  @AuditEvent('business.asset.upload', { resourceType: 'asset' })
  async upload(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @CurrentUser() business: SessionUser,
  ) {
    const data = await req.file();
    if (!data) {
      return res.status(400).send({ error: 'No file provided' });
    }

    const url = await uploadLinktreeImage(
      data,
      this.storageService,
      business.id,
      'businesses',
    );

    return res.send({ url });
  }
}
