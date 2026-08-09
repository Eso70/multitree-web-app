import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { BillingManagementService } from './billing-management.service';
import {
  CreateEntitlementDto,
  CreatePlanDto,
  CreateSubscriptionPlanDto,
  ReviewApprovalDto,
  UpdatePlanConfigurationDto,
  UpdateEntitlementDto,
  UpdatePermissionProfileDto,
  UpdatePlanDto,
  UpdateSubscriptionPlanDto,
  UpsertBusinessSubscriptionDto,
} from './dto/billing-management.dto';
import { AuthorizationService } from '../auth/authorization.service';
import { ApprovalService } from '../auth/approval.service';
import { BillingOverviewQueryDto } from './dto/billing-overview-query.dto';

@Controller('api/platform/billing')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class BillingManagementController {
  constructor(private readonly service: BillingManagementService) {}

  @Get()
  @RequireCapabilities(
    Capability.PlatformBillingEntitlementsRead,
    Capability.PlatformBillingPlansRead,
    Capability.PlatformBillingSubscriptionsRead,
  )
  async overview(@Query() query: BillingOverviewQueryDto) {
    return { success: true, data: await this.service.getOverview(query) };
  }

  @Post('entitlements')
  @RequireCapabilities(Capability.PlatformBillingEntitlementsCreate)
  @AuditEvent('platform.billing.entitlement.create', {
    resourceType: 'billing-entitlement',
  })
  async createEntitlement(@Body() dto: CreateEntitlementDto) {
    return { success: true, data: await this.service.createEntitlement(dto) };
  }

  @Patch('entitlements/:id')
  @RequireCapabilities(Capability.PlatformBillingEntitlementsUpdate)
  @AuditEvent('platform.billing.entitlement.update', {
    resourceType: 'billing-entitlement',
    resourceIdParam: 'id',
  })
  async updateEntitlement(
    @Param('id') id: string,
    @Body() dto: UpdateEntitlementDto,
  ) {
    return {
      success: true,
      data: await this.service.updateEntitlement(id, dto),
    };
  }

  @Post('plans')
  @RequireCapabilities(Capability.PlatformBillingPlansCreate)
  @AuditEvent('platform.billing.plan.create', { resourceType: 'billing-plan' })
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser() user: SessionUser,
  ) {
    return { success: true, data: await this.service.createPlan(dto, user.id) };
  }

  @Patch('plans/:id')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  @AuditEvent('platform.billing.plan.update', {
    resourceType: 'billing-plan',
    resourceIdParam: 'id',
  })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return { success: true, data: await this.service.updatePlan(id, dto) };
  }

  @Patch('plans/:id/profile')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  @AuditEvent('platform.billing.permission_profile.update', {
    resourceType: 'billing-plan',
    resourceIdParam: 'id',
  })
  async updatePermissionProfile(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionProfileDto,
  ) {
    return {
      success: true,
      data: await this.service.updatePermissionProfile(id, dto),
    };
  }

  @Delete('plans/:id')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  @AuditEvent('platform.billing.permission_profile.delete', {
    resourceType: 'billing-plan',
    resourceIdParam: 'id',
  })
  async deletePermissionProfile(@Param('id') id: string) {
    return {
      success: true,
      data: await this.service.deletePermissionProfile(id),
    };
  }

  @Post('subscription-plans')
  @RequireCapabilities(Capability.PlatformBillingPlansCreate)
  @AuditEvent('platform.billing.subscription_plan.create', {
    resourceType: 'billing-subscription-plan',
  })
  async createSubscriptionPlan(
    @Body() dto: CreateSubscriptionPlanDto,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.createSubscriptionPlan(dto, user.id),
    };
  }

  @Patch('subscription-plans/:id')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  @AuditEvent('platform.billing.subscription_plan.update', {
    resourceType: 'billing-subscription-plan',
    resourceIdParam: 'id',
  })
  async updateSubscriptionPlan(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return {
      success: true,
      data: await this.service.updateSubscriptionPlan(id, dto),
    };
  }

  @Delete('subscription-plans/:id')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  @AuditEvent('platform.billing.subscription_plan.delete', {
    resourceType: 'billing-subscription-plan',
    resourceIdParam: 'id',
  })
  async deleteSubscriptionPlan(@Param('id') id: string) {
    return {
      success: true,
      data: await this.service.deleteSubscriptionPlan(id),
    };
  }

  @Post('subscriptions')
  @RequireCapabilities(Capability.PlatformBillingSubscriptionsAssign)
  @AuditEvent('platform.billing.subscription.upsert', {
    resourceType: 'business-subscription',
  })
  async subscription(
    @Body() dto: UpsertBusinessSubscriptionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.service.upsertSubscription(dto, user.id),
    };
  }

  @Get('plans/:id/configuration')
  @RequireCapabilities(Capability.PlatformBillingPlansRead)
  async configuration(@Param('id') id: string) {
    return {
      success: true,
      data: await this.service.getPlanConfiguration(id),
    };
  }

  @Patch('plans/:id/configuration')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  @AuditEvent('platform.billing.plan_configuration.update', {
    resourceType: 'billing-plan',
    resourceIdParam: 'id',
  })
  async updateConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdatePlanConfigurationDto,
  ) {
    return {
      success: true,
      data: await this.service.updatePlanConfiguration(id, dto),
    };
  }
}

@Controller('api/platform/permissions')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
export class PermissionCatalogController {
  constructor(private readonly billing: BillingManagementService) {}

  @Get('catalog')
  @RequireCapabilities(Capability.PlatformBillingPlansRead)
  async catalog() {
    return { success: true, data: await this.billing.getPermissionCatalog() };
  }
}

@Controller('api/platform/businesses')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class BusinessAccessController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Get(':id/effective-access')
  @RequireCapabilities(Capability.PlatformBillingSubscriptionsRead)
  async effectiveAccess(@Param('id') id: string) {
    return {
      success: true,
      data: await this.authorization.getEffectiveAccess(id),
    };
  }
}

@Controller('api/platform/approvals')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class ApprovalManagementController {
  constructor(private readonly approvals: ApprovalService) {}

  @Get()
  @RequireCapabilities(Capability.PlatformBillingApprovalsRead)
  async list(@Query('status') status?: string) {
    return { success: true, data: await this.approvals.list(status) };
  }

  @Post(':id/approve')
  @RequireCapabilities(Capability.PlatformBillingApprovalsReview)
  @AuditEvent('platform.billing.approval.approve', {
    resourceType: 'permission-approval',
    resourceIdParam: 'id',
  })
  async approve(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.approvals.review({
        id,
        actorId: user.id,
        action: 'approve',
      }),
    };
  }

  @Post(':id/reject')
  @RequireCapabilities(Capability.PlatformBillingApprovalsReview)
  @AuditEvent('platform.billing.approval.reject', {
    resourceType: 'permission-approval',
    resourceIdParam: 'id',
  })
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.approvals.review({
        id,
        actorId: user.id,
        action: 'reject',
        rejectionReason: dto.rejectionReason,
      }),
    };
  }
}
