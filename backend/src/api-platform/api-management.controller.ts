import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.service';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuditEvent } from '../auth/audit-event.decorator';
import { ApiManagementService } from './api-management.service';
import {
  CreateApiClientDto,
  CreateApiVersionDto,
  CreateWebhookDto,
  UpdateApiClientStatusDto,
  UpdateCatalogGroupDto,
  UpdateRatePolicyDto,
  UpdateWebhookStatusDto,
  ValidateWebhookDto,
} from './dto/api-platform.dto';
import { ApiManagementQueryDto } from './dto/api-management-query.dto';

@Controller('api/platform/api-management')
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AuditInterceptor)
export class ApiManagementController {
  constructor(private readonly service: ApiManagementService) {}

  @Get()
  async dashboard(@Query() query: ApiManagementQueryDto) {
    return { success: true, data: await this.service.getDashboard(query) };
  }

  @Post('clients')
  @AuditEvent('platform.api.client.create', { resourceType: 'api-client' })
  async createClient(
    @Body() dto: CreateApiClientDto,
    @CurrentUser() admin: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.createClient(dto, admin.id),
    };
  }

  @Post('clients/:id/rotate')
  @AuditEvent('platform.api.client.rotate', {
    resourceType: 'api-client',
    resourceIdParam: 'id',
  })
  async rotateClient(@Param('id') id: string) {
    return { success: true, data: await this.service.rotateClient(id) };
  }

  @Patch('clients/:id/status')
  @AuditEvent('platform.api.client.status', {
    resourceType: 'api-client',
    resourceIdParam: 'id',
  })
  async clientStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApiClientStatusDto,
  ) {
    await this.service.updateClientStatus(id, dto.status);
    return { success: true };
  }

  @Post('webhooks')
  @AuditEvent('platform.api.webhook.create', { resourceType: 'webhook' })
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() admin: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.createWebhook(dto, admin.id),
    };
  }

  @Patch('webhooks/:id/status')
  @AuditEvent('platform.api.webhook.status', {
    resourceType: 'webhook',
    resourceIdParam: 'id',
  })
  async webhookStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookStatusDto,
  ) {
    await this.service.updateWebhookStatus(id, dto.status);
    return { success: true };
  }

  @Post('webhooks/:id/rotate-secret')
  @AuditEvent('platform.api.webhook.rotate', {
    resourceType: 'webhook',
    resourceIdParam: 'id',
  })
  async rotateWebhook(@Param('id') id: string) {
    return { success: true, data: await this.service.rotateWebhookSecret(id) };
  }

  @Post('webhooks/:id/test')
  @AuditEvent('platform.api.webhook.test', {
    resourceType: 'webhook',
    resourceIdParam: 'id',
  })
  async testWebhook(@Param('id') id: string) {
    return { success: true, data: await this.service.testWebhook(id) };
  }

  @Post('webhooks/validate')
  @AuditEvent('platform.api.webhook.validate', { resourceType: 'webhook' })
  async validateWebhook(@Body() dto: ValidateWebhookDto) {
    return {
      success: true,
      data: await this.service.validateWebhookConnection(dto.url),
    };
  }

  @Patch('policies/:businessId')
  @AuditEvent('platform.api.policy.update', {
    resourceType: 'api-policy',
    resourceIdParam: 'businessId',
  })
  async updatePolicy(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateRatePolicyDto,
    @CurrentUser() admin: SessionUser,
  ) {
    await this.service.updatePolicy(businessId, dto, admin.id);
    return { success: true };
  }

  @Patch('catalog/:catalogId')
  @AuditEvent('platform.api.catalog.update', { resourceType: 'api-catalog' })
  async updateCatalog(
    @Param('catalogId') catalogId: string,
    @Body() dto: UpdateCatalogGroupDto,
  ) {
    await this.service.updateCatalog(catalogId, dto.enabled);
    return { success: true };
  }

  @Post('versions')
  @AuditEvent('platform.api.version.create', { resourceType: 'api-version' })
  async createVersion(@Body() dto: CreateApiVersionDto) {
    return { success: true, data: await this.service.createVersion(dto) };
  }

  @Post('versions/:id/notify')
  @AuditEvent('platform.api.version.notify', {
    resourceType: 'api-version',
    resourceIdParam: 'id',
  })
  async notifyVersion(
    @Param('id') id: string,
    @CurrentUser() admin: SessionUser,
  ) {
    return { success: true, data: await this.service.notifyVersion(id, admin) };
  }

  @Get('documentation')
  async documentation() {
    return { success: true, data: await this.service.documentation() };
  }
}
