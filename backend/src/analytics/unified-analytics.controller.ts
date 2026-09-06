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
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import type { SessionUser } from '../auth/session.service';
import { analyticsRequestContext } from '../common/request-context';
import { RedisService } from '../redis/redis.service';
import {
  TrackAnalyticsBatchDto,
  TrackAnalyticsEventDto,
  TrackAnalyticsRedirectDto,
} from './dto/analytics-event.dto';
import { AnalyticsReadService } from './analytics-read.service';
import { UnifiedAnalyticsService } from './unified-analytics.service';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';
import { TikTokPixelConfigService } from '../auth/tiktok-pixel-config.service';
import { TestTikTokEventsApiDto } from './dto/test-tiktok-events-api.dto';

function redirectQueryString(
  query: Record<string, unknown>,
  key: string,
  maxLength?: number,
): string | undefined {
  const value = query[key];
  if (typeof value !== 'string') return undefined;
  return maxLength === undefined ? value : value.slice(0, maxLength);
}

function prepareRedirectQuery(
  query: Record<string, unknown>,
  receivedAt: string,
): TrackAnalyticsRedirectDto {
  return plainToInstance(TrackAnalyticsRedirectDto, {
    eventId: redirectQueryString(query, 'eventId'),
    eventName: redirectQueryString(query, 'eventName'),
    visitorId: redirectQueryString(query, 'visitorId', 128),
    sessionId: redirectQueryString(query, 'sessionId', 128),
    // A verified navigation is happening now. Random visitors can have a
    // badly configured phone clock, so their client timestamp must not make a
    // real registered click miss the business's analytics.
    occurredAt: receivedAt,
    pageUrl: redirectQueryString(query, 'pageUrl', 2048),
    referrer: redirectQueryString(query, 'referrer', 2048),
    ttclid: redirectQueryString(query, 'ttclid', 255),
    ttp: redirectQueryString(query, 'ttp', 255),
    consentState: redirectQueryString(query, 'consentState'),
    browserDispatched: redirectQueryString(query, 'browserDispatched'),
    browserEventName: redirectQueryString(query, 'browserEventName'),
  });
}

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
    const prepared = await Promise.all(
      body.events.map(async (rawEvent) => {
        const raw =
          rawEvent && typeof rawEvent === 'object' && !Array.isArray(rawEvent)
            ? (rawEvent as Record<string, unknown>)
            : undefined;
        const eventId = typeof raw?.eventId === 'string' ? raw.eventId : '';
        if (!raw) return { eventId };
        const event = plainToInstance(TrackAnalyticsEventDto, raw);
        const errors = await validate(event, {
          whitelist: true,
          forbidNonWhitelisted: true,
          forbidUnknownValues: true,
        });
        return errors.length ? { eventId } : { eventId, event };
      }),
    );
    await this.accessRules.assertForPublicPages(
      context.ip,
      prepared.flatMap(({ event }) => (event ? [event.pageId] : [])),
    );
    const visitorKey = prepared.find(({ event }) => event)?.event?.visitorId;
    const [visitorLimited, addressLimited] = await Promise.all([
      this.redis.isRateLimited(
        `rl:analytics-v2:${context.ip}:${visitorKey || 'invalid'}`,
        180,
        60,
      ),
      // A high address ceiling still bounds abuse if a caller rotates visitor
      // ids, without grouping ordinary visitors behind one CDN/proxy address
      // into the much smaller per-visitor allowance.
      this.redis.isRateLimited(`rl:analytics-v2-ip:${context.ip}`, 5_000, 60),
    ]);
    if (visitorLimited || addressLimited) {
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
    for (const preparedEvent of prepared) {
      const event = preparedEvent.event;
      if (!event) {
        results.push({
          accepted: false,
          deduplicated: false,
          eventId: preparedEvent.eventId,
        });
        continue;
      }
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

  /**
   * Records a real outbound action before sending the visitor to its target.
   *
   * TikTok's in-app browser may suspend the landing page as soon as WhatsApp
   * opens. A background fetch can be cancelled in that transition even though
   * TikTok's own pixel call already ran. This first-party hop makes the click
   * request itself the navigation, so the server commits it before returning
   * the redirect. The normal queue sends the same event id as a fallback and
   * database idempotency collapses whichever request arrives second.
   */
  @Get('open/:pageId/:actionId')
  async open(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    // Keep the raw query out of the global DTO pipe. Validation belongs inside
    // the fail-open block below; otherwise one oversized TikTok attribution
    // value can return 400 before the registered destination is resolved.
    @Query() query: Record<string, unknown>,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    // Resolve first. The destination is owned by the registered action and is
    // never read from the query string, preventing an arbitrary open redirect.
    const destination = await this.analytics.resolveRedirectDestination(
      pageId,
      actionId,
      redirectQueryString(query, 'message', 2000),
    );
    const context = analyticsRequestContext(request);
    const redirectEvent = prepareRedirectQuery(query, new Date().toISOString());

    try {
      const validationErrors = await validate(redirectEvent, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });
      if (validationErrors.length) {
        throw new Error(
          `invalid handoff fields: ${validationErrors
            .map(({ property }) => property)
            .join(', ')}`,
        );
      }
      await this.accessRules.assertForPublicPages(context.ip, [pageId]);
      const [visitorLimited, addressLimited] = await Promise.all([
        this.redis.isRateLimited(
          `rl:analytics-v2:${context.ip}:${redirectEvent.visitorId}`,
          180,
          60,
        ),
        this.redis.isRateLimited(`rl:analytics-v2-ip:${context.ip}`, 5_000, 60),
      ]);
      if (!visitorLimited && !addressLimited) {
        await this.analytics.ingest(
          plainToInstance(TrackAnalyticsEventDto, {
            ...redirectEvent,
            pageId,
            actionId,
            browserDispatched: redirectEvent.browserDispatched === 'true',
            properties: { delivery: 'first_party_redirect' },
          }),
          context,
        );
      }
    } catch (error) {
      // Analytics must fail open: a database, Redis, or policy error must not
      // stop the visitor reaching the business they intentionally selected.
      this.logger.warn(
        `Tracked navigation analytics failed (${redirectEvent.eventId || 'unknown'}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    reply.header('Cache-Control', 'no-store, private');
    reply.header('Referrer-Policy', 'no-referrer');
    return reply.redirect(destination, HttpStatus.FOUND);
  }
}

@Controller('api/analytics/v2')
@UseGuards(BusinessGuard, AuthorizationGuard)
export class BusinessUnifiedAnalyticsController {
  constructor(
    private readonly analytics: UnifiedAnalyticsService,
    private readonly reads: AnalyticsReadService,
    private readonly tikTokPixels: TikTokPixelConfigService,
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

  @Post('tiktok/test')
  @RequireCapabilities(Capability.BusinessAnalyticsTikTokHealthRead)
  async testTikTok(
    @CurrentUser() business: SessionUser,
    @Body() body: TestTikTokEventsApiDto,
    @Req() request: FastifyRequest,
  ) {
    const context = analyticsRequestContext(request);
    return {
      success: true,
      data: await this.tikTokPixels.testEventsApi(business.id, body, {
        ip: context.ip,
        userAgent: context.userAgent,
      }),
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
