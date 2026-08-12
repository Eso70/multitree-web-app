import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import type { SessionUser } from '../auth/session.service';
import { analyticsRequestContext } from '../common/request-context';
import { RedisService } from '../redis/redis.service';
import { TrackAnalyticsBatchDto } from './dto/analytics-event.dto';
import {
  CreateCrmNoteDto,
  CRM_LEAD_STATUSES,
  type CrmLeadStatus,
  UpdateCrmLeadStatusDto,
} from './dto/analytics-crm.dto';
import { AnalyticsReadService } from './analytics-read.service';
import { UnifiedAnalyticsService } from './unified-analytics.service';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';

@Controller('api/public/analytics')
export class PublicUnifiedAnalyticsController {
  private readonly logger = new Logger(PublicUnifiedAnalyticsController.name);

  constructor(
    private readonly analytics: UnifiedAnalyticsService,
    private readonly redis: RedisService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  async events(
    @Body() body: TrackAnalyticsBatchDto,
    @Req() request: FastifyRequest,
  ) {
    const context = analyticsRequestContext(request);
    await this.accessRules.assertForPublicPages(
      context.ip,
      body.events.map((event) => event.pageId),
    );
    const limited = await this.redis.isRateLimited(
      `rl:analytics-v2:${context.ip}`,
      180,
      60,
    );
    if (limited) {
      throw new HttpException(
        { message: 'Too many analytics requests', retryAfter: 60 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    /**
     * One rejected event must not take the batch down with it.
     *
     * The client stores its queue and puts the whole batch back on any
     * failure, so a single permanently-invalid event — one naming an action
     * the business has since deleted, or one whose clock drifted past the
     * accepted window — used to fail the request forever. It sat at the front
     * of every retry and blocked every later event behind it until it aged
     * out. Rejecting it individually lets the rest through and lets the client
     * drop it.
     */
    // Sequential, not concurrent: each ingest opens a transaction and takes an
    // advisory lock keyed to the visitor, so running a batch in parallel would
    // have every event in it queueing behind its own siblings.
    const results: Array<{
      accepted: boolean;
      deduplicated: boolean;
      eventId: string;
    }> = [];
    for (const event of body.events) {
      try {
        results.push(await this.analytics.ingest(event, context));
      } catch (error) {
        this.logger.warn(
          `Analytics event rejected (${event.eventId}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        results.push({
          accepted: false,
          deduplicated: false,
          eventId: event.eventId,
        });
      }
    }
    return {
      success: true,
      data: {
        accepted: results.filter((result) => result.accepted).length,
        deduplicated: results.filter((result) => result.deduplicated).length,
        // Per event, so the client can retire exactly the ones that will never
        // be accepted instead of retrying the batch whole.
        events: results,
      },
    };
  }
}

@Controller('api/analytics/v2')
@UseGuards(BusinessGuard, AuthorizationGuard)
export class BusinessUnifiedAnalyticsController {
  constructor(
    private readonly analytics: UnifiedAnalyticsService,
    private readonly reads: AnalyticsReadService,
  ) {}

  @Get('pages')
  @RequireCapabilities(Capability.BusinessAnalyticsTotalsRead)
  async pages(
    @CurrentUser() business: SessionUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getPages(business.id, { from, to }),
    };
  }

  @Get('summary')
  @RequireCapabilities(Capability.BusinessAnalyticsTotalsRead)
  async summary(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
    @Query('pageType') pageType?: 'linktree' | 'mini_website',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.analytics.getSummary(business.id, {
        pageId,
        pageType,
        from,
        to,
      }),
    };
  }

  @Get('pages/:pageId/daily')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async daily(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Query('days') days?: string,
  ) {
    return {
      success: true,
      data: await this.analytics.getDaily(
        business.id,
        pageId,
        Math.min(Math.max(Number(days) || 30, 1), 3650),
      ),
    };
  }

  @Get('daily')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async timeline(
    @CurrentUser() business: SessionUser,
    @Query('days') days?: string,
    @Query('pageId') pageId?: string,
    @Query('pageType') pageType?: 'linktree' | 'mini_website',
  ) {
    return {
      success: true,
      data: await this.analytics.getTimeline(
        business.id,
        Math.min(Math.max(Number(days) || 30, 1), 3650),
        { pageId, pageType },
      ),
    };
  }

  @Get('breakdowns')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async breakdowns(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
    @Query('pageType') pageType?: 'linktree' | 'mini_website',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getBreakdowns(business.id, {
        pageId,
        pageType,
        from,
        to,
      }),
    };
  }

  @Get('pages/:pageId/visitors')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async visitors(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getVisitors(
        business.id,
        { pageId, from, to },
        Number(limit) || 50,
        Number(offset) || 0,
      ),
    };
  }

  @Get('pages/:pageId/visitors/:visitorId/journey')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async visitorJourney(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('visitorId', ParseUUIDPipe) visitorId: string,
  ) {
    return {
      success: true,
      data: await this.reads.getVisitorJourney(business.id, pageId, visitorId),
    };
  }

  @Get('pages/:pageId/actions')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async actions(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getActions(business.id, { pageId, from, to }),
    };
  }

  @Get('visitors')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async allVisitors(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
    @Query('pageType') pageType?: 'linktree' | 'mini_website',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getVisitors(
        business.id,
        { pageId, pageType, from, to },
        Number(limit) || 50,
        Number(offset) || 0,
      ),
    };
  }

  @Get('visitors/:visitorId/journey')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async allVisitorJourney(
    @CurrentUser() business: SessionUser,
    @Param('visitorId', ParseUUIDPipe) visitorId: string,
    @Query('pageId') pageId?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getVisitorJourney(business.id, pageId, visitorId),
    };
  }

  @Get('actions')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async allActions(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
    @Query('pageType') pageType?: 'linktree' | 'mini_website',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getActions(business.id, {
        pageId,
        pageType,
        from,
        to,
      }),
    };
  }

  @Get('funnel')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async funnel(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
    @Query('pageType') pageType?: 'linktree' | 'mini_website',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getFunnel(business.id, {
        pageId,
        pageType,
        from,
        to,
      }),
    };
  }

  @Get('retention')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async retention(
    @CurrentUser() business: SessionUser,
    @Query('weeks') weeks?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getRetention(business.id, Number(weeks) || 8),
    };
  }

  @Get('realtime')
  @RequireCapabilities(Capability.BusinessAnalyticsAdvancedRead)
  async realtime(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getRealtime(business.id, pageId),
    };
  }

  @Get('pages/:pageId/crm/summary')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async crmSummary(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
  ) {
    return {
      success: true,
      data: await this.reads.getCrmSummary(business.id, pageId),
    };
  }

  @Get('crm/summary')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async allCrmSummary(
    @CurrentUser() business: SessionUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getCrmSummary(business.id, undefined, {
        from,
        to,
      }),
    };
  }

  @Get('pages/:pageId/crm/leads')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async crmLeads(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Query('status') status?: CrmLeadStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const normalizedStatus = CRM_LEAD_STATUSES.includes(status as CrmLeadStatus)
      ? status
      : undefined;
    return {
      success: true,
      data: await this.reads.getCrmLeads(
        business.id,
        pageId,
        normalizedStatus,
        Number(limit) || 500,
        Number(offset) || 0,
      ),
    };
  }

  @Patch('crm/leads/:leadId/status')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async updateCrmLeadStatus(
    @CurrentUser() business: SessionUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() body: UpdateCrmLeadStatusDto,
  ) {
    return {
      success: true,
      data: await this.reads.updateLeadStatus(business.id, leadId, body.status),
    };
  }

  @Post('crm/leads/:leadId/notes')
  @RequireCapabilities(Capability.BusinessAnalyticsDetailsRead)
  async addCrmNote(
    @CurrentUser() business: SessionUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() body: CreateCrmNoteDto,
  ) {
    return {
      success: true,
      data: await this.reads.addLeadNote(business.id, leadId, body.body),
    };
  }

  @Get('tiktok/health')
  @RequireCapabilities(Capability.BusinessAnalyticsTikTokHealthRead)
  async tikTokHealth(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getTikTokHealth(business.id, {
        pageId,
        from,
        to,
      }),
    };
  }

  /**
   * The errors behind a failing connection. Separate from `tiktok/health`
   * because the Dashboard reads that summary on every load and has no use for
   * error rows; only the TikTok configuration page asks for these.
   */
  @Get('tiktok/errors')
  @RequireCapabilities(Capability.BusinessAnalyticsTikTokHealthRead)
  async tikTokErrors(
    @CurrentUser() business: SessionUser,
    @Query('limit') limit?: string,
  ) {
    return {
      success: true,
      data: await this.reads.getTikTokDeliveryErrors(
        business.id,
        Number(limit) || 20,
      ),
    };
  }

  @Post('tiktok/retry-failed')
  @RequireCapabilities(Capability.BusinessAnalyticsTikTokHealthRead)
  async retryFailedTikTok(
    @CurrentUser() business: SessionUser,
    @Query('pageId') pageId?: string,
  ) {
    return {
      success: true,
      data: {
        retried: await this.reads.retryFailedTikTokEvents(business.id, pageId),
      },
    };
  }

  @Delete()
  @RequireCapabilities(Capability.BusinessAnalyticsClearAll)
  async clearAll(@CurrentUser() business: SessionUser) {
    await this.analytics.clear(business.id);
    return { success: true };
  }

  @Delete('pages/:pageId')
  @RequireCapabilities(Capability.BusinessAnalyticsClearLinktree)
  async clearPage(
    @CurrentUser() business: SessionUser,
    @Param('pageId', ParseUUIDPipe) pageId: string,
  ) {
    await this.analytics.clear(business.id, pageId);
    return { success: true };
  }
}
