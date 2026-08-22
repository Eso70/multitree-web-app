import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import {
  ListCreatorsDto,
  ManageCreatorDto,
} from '../creator/dto/manage-creator.dto';
import { CreatorAdministrationService } from './creator-administration.service';

@Controller('api/platform/creators')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class CreatorAdministrationController {
  constructor(private readonly creators: CreatorAdministrationService) {}

  @Get()
  @RequireCapabilities(Capability.PlatformCreatorsRead)
  async list(@Query() query: ListCreatorsDto) {
    return { success: true, data: await this.creators.list(query) };
  }

  @Patch(':id')
  @RequireCapabilities(Capability.PlatformCreatorsManage)
  @AuditEvent('platform.creator.manage', {
    resourceType: 'creator-account',
    resourceIdParam: 'id',
  })
  async manage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ManageCreatorDto,
  ) {
    return { success: true, data: await this.creators.manage(id, data) };
  }

  @Delete(':id/page')
  @RequireCapabilities(Capability.PlatformCreatorsManage)
  @AuditEvent('platform.creator.page.delete', {
    resourceType: 'creator-account',
    resourceIdParam: 'id',
  })
  async deletePage(@Param('id', ParseUUIDPipe) id: string) {
    return { success: true, data: await this.creators.deletePage(id) };
  }
}
