import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import type { SessionUser } from '../auth/session.service';
import { AnalyticsReadService } from './analytics-read.service';
import { UnifiedAnalyticsService } from './unified-analytics.service';

@Controller('api')
@UseGuards(BusinessGuard, AuthorizationGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: UnifiedAnalyticsService,
    private readonly reads: AnalyticsReadService,
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
}
