import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import type { SessionUser } from '../auth/session.service';
import { EntitlementService } from '../billing/entitlement.service';
import { AnalyticsReadService } from './analytics-read.service';
import { UnifiedAnalyticsService } from './unified-analytics.service';

@Controller('api')
@UseGuards(BusinessGuard, AuthorizationGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: UnifiedAnalyticsService,
    private readonly reads: AnalyticsReadService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Get('linktrees/:id/analytics')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async details(@Param('id') id: string, @CurrentUser() business: SessionUser) {
    return {
      success: true,
      data: await this.reads.getLinktreeDetails(business.id, id),
    };
  }

  @Post('analytics/clear-all')
  @RequireCapabilities(Capability.BusinessAnalyticsClearAll)
  @HttpCode(HttpStatus.OK)
  async clearAll(@CurrentUser() business: SessionUser) {
    await this.analytics.clear(business.id);
    return { success: true, message: 'All analytics cleared' };
  }

  @Post('linktrees/:id/analytics/clear')
  @RequireCapabilities(Capability.BusinessAnalyticsClearLinktree)
  @HttpCode(HttpStatus.OK)
  async clearPage(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
  ) {
    await this.analytics.clear(business.id, id);
    return { success: true, message: 'Page analytics cleared' };
  }

  @Get('linktrees/:id/analytics/daily')
  @RequireCapabilities(Capability.BusinessAnalyticsDailyRead)
  async daily(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
    @Query('days') days?: string,
  ) {
    const range = await this.allowedRange(business.id, Number(days) || 90);
    return {
      success: true,
      data: await this.analytics.getDaily(business.id, id, range),
    };
  }

  @Get('linktrees/:id/analytics/range')
  @RequireCapabilities(Capability.BusinessAnalyticsRangeRead)
  async range(
    @Param('id') id: string,
    @CurrentUser() business: SessionUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (from && to) {
      const days =
        Math.ceil(
          Math.abs(new Date(to).getTime() - new Date(from).getTime()) /
            86_400_000,
        ) + 1;
      await this.allowedRange(business.id, days);
    }
    const summary = await this.analytics.getSummary(business.id, {
      pageId: id,
      from,
      to,
    });
    return {
      success: true,
      data: {
        from: from || null,
        to: to || null,
        views: summary.total_views,
        unique_views: summary.unique_views,
        clicks: summary.total_clicks,
        unique_clicks: summary.unique_clicks,
        unique_link_clicks: summary.unique_clicks,
      },
    };
  }

  private async allowedRange(
    businessId: string,
    requestedDays: number,
  ): Promise<number> {
    const maximum = await this.entitlements.getInteger(
      businessId,
      'limit.analytics_range_days',
      0,
    );
    const requested = Math.min(Math.max(requestedDays, 1), 3650);
    if (maximum !== -1 && requested > maximum) {
      throw new ForbiddenException(
        'The analytics date range exceeds the plan limit',
      );
    }
    return maximum === -1 ? requested : Math.min(requested, maximum);
  }
}
