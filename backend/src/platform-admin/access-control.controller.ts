import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { AccessControlService } from './access-control.service';
import { SimulateAuthorizationDto } from './dto/access-control.dto';

@Controller('api/platform/access-control')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}

  @Get()
  @RequireCapabilities(Capability.PlatformAccessControlCatalogRead)
  async overview() {
    return { success: true, data: await this.service.getOverview() };
  }

  @Post('simulate')
  @RequireCapabilities(Capability.PlatformAccessControlSimulate)
  @AuditEvent('platform.access_control.simulate', {
    resourceType: 'authorization-policy',
  })
  async simulate(@Body() dto: SimulateAuthorizationDto) {
    return { success: true, data: await this.service.simulate(dto) };
  }
}
