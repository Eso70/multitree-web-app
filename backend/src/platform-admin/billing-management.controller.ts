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
} from '@nestjs/common';
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
  async createEntitlement(@Body() dto: CreateEntitlementDto) {
    return { success: true, data: await this.service.createEntitlement(dto) };
  }

  @Patch('entitlements/:id')
  @RequireCapabilities(Capability.PlatformBillingEntitlementsUpdate)
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
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser() user: SessionUser,
  ) {
    return { success: true, data: await this.service.createPlan(dto, user.id) };
  }

  @Patch('plans/:id')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return { success: true, data: await this.service.updatePlan(id, dto) };
  }

  @Patch('plans/:id/profile')
  @RequireCapabilities(Capability.PlatformBillingPlansUpdate)
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
  async deletePermissionProfile(@Param('id') id: string) {
    return {
      success: true,
      data: await this.service.deletePermissionProfile(id),
    };
  }

  @Post('subscription-plans')
  @RequireCapabilities(Capability.PlatformBillingPlansCreate)
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
  async deleteSubscriptionPlan(@Param('id') id: string) {
    return {
      success: true,
      data: await this.service.deleteSubscriptionPlan(id),
    };
  }

  @Post('subscriptions')
  @RequireCapabilities(Capability.PlatformBillingSubscriptionsAssign)
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
export class ApprovalManagementController {
  constructor(private readonly approvals: ApprovalService) {}

  @Get()
  @RequireCapabilities(Capability.PlatformBillingApprovalsRead)
  async list(@Query('status') status?: string) {
    return { success: true, data: await this.approvals.list(status) };
  }

  @Post(':id/approve')
  @RequireCapabilities(Capability.PlatformBillingApprovalsReview)
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
