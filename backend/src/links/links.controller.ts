import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { SyncLinksDto } from './dto/sync-links.dto';
import { BusinessGuard } from '../auth/business.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.service';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuditEvent } from '../auth/audit-event.decorator';

@Controller('api/links')
@UseGuards(BusinessGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get('linktree/:linktreeId')
  @RequireCapabilities(Capability.BusinessLinksRead)
  async getByLinktree(
    @Param('linktreeId') linktreeId: string,
    @CurrentUser() business: SessionUser,
  ) {
    const links = await this.linksService.getLinksByLinktree(
      linktreeId,
      business.id,
    );
    return { success: true, data: links };
  }

  @Post()
  @RequireCapabilities(Capability.BusinessLinksCreate)
  @AuditEvent('business.link.create', {
    resourceType: 'link',
    resourceLabelField: 'display_name',
  })
  async create(
    @Body() createDto: CreateLinkDto,
    @CurrentUser() business: SessionUser,
  ) {
    const link = await this.linksService.createLink(createDto, business.id);
    return { success: true, data: link };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.BusinessLinksUpdate)
  @AuditEvent('business.link.update', {
    resourceType: 'link',
    resourceIdParam: 'id',
    resourceLabelField: 'display_name',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLinkDto,
    @CurrentUser() business: SessionUser,
  ) {
    const link = await this.linksService.updateLink(id, updateDto, business.id);
    return { success: true, data: link };
  }

  @Delete(':id')
  @RequireCapabilities(Capability.BusinessLinksDelete)
  @AuditEvent('business.link.delete', {
    resourceType: 'link',
    resourceIdParam: 'id',
  })
  async delete(@Param('id') id: string, @CurrentUser() business: SessionUser) {
    await this.linksService.deleteLink(id, business.id);
    return { success: true, message: 'Link deleted successfully' };
  }

  @Post('sync/:linktreeId')
  @RequireCapabilities(Capability.BusinessLinksSync)
  @AuditEvent('business.linktree.links.sync', {
    resourceType: 'linktree',
    resourceIdParam: 'linktreeId',
  })
  async sync(
    @Param('linktreeId') linktreeId: string,
    @Body() body: SyncLinksDto,
    @CurrentUser() business: SessionUser,
  ) {
    await this.linksService.syncLinks(linktreeId, body.links, business.id);
    return { success: true, message: 'Links synchronized successfully' };
  }
}
