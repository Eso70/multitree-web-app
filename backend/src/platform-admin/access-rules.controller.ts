import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import type { SessionUser } from '../auth/session.service';
import { AccessRulesService } from './access-rules.service';
import { AccessRuleQueryDto } from './dto/access-rule-query.dto';
import { CreateAccessRuleDto } from './dto/create-access-rule.dto';
import { AccessRuleStatusDto } from './dto/access-rule-status.dto';

@Controller('api/platform/access-rules')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class AccessRulesController {
  constructor(private readonly service: AccessRulesService) {}
  @Get()
  @RequireCapabilities(Capability.PlatformAccessRulesList)
  async getPage(@Query() query: AccessRuleQueryDto) {
    return { success: true, data: await this.service.getPage(query) };
  }
  @Post()
  @RequireCapabilities(Capability.PlatformAccessRulesCreate)
  @AuditEvent('platform.access_rule.create', { resourceType: 'access-rule' })
  async create(
    @Body() body: CreateAccessRuleDto,
    @CurrentUser() user?: SessionUser,
  ) {
    return { success: true, data: await this.service.create(body, user?.id) };
  }
  @Put(':id')
  @RequireCapabilities(Capability.PlatformAccessRulesUpdate)
  @AuditEvent('platform.access_rule.update', {
    resourceType: 'access-rule',
    resourceIdParam: 'id',
  })
  async update(@Param('id') id: string, @Body() body: CreateAccessRuleDto) {
    return { success: true, data: await this.service.update(id, body) };
  }
  @Patch(':id/status')
  @RequireCapabilities(Capability.PlatformAccessRulesStatusUpdate)
  @AuditEvent('platform.access_rule.status', {
    resourceType: 'access-rule',
    resourceIdParam: 'id',
  })
  async status(@Param('id') id: string, @Body() body: AccessRuleStatusDto) {
    return {
      success: true,
      data: await this.service.setStatus(id, body.status),
    };
  }
  @Delete(':id')
  @RequireCapabilities(Capability.PlatformAccessRulesDelete)
  @AuditEvent('platform.access_rule.delete', {
    resourceType: 'access-rule',
    resourceIdParam: 'id',
  })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }
}
