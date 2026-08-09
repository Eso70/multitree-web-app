import {
  Controller,
  Get,
  Param,
  Req,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PublicService } from './public.service';
import { RedisService } from '../redis/redis.service';
import { Subdomain } from '../auth/subdomain.decorator';
import type { FastifyRequest } from 'fastify';
import { requestIp } from '../common/request-context';
import { AccessRuleEnforcementService } from '../auth/access-rule-enforcement.service';

@Controller('api/public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly redisService: RedisService,
    private readonly accessRules: AccessRuleEnforcementService,
  ) {}

  @Get('business')
  async getBusiness(
    @Subdomain() subdomain: string,
    @Req() request?: FastifyRequest,
  ) {
    if (!subdomain) {
      throw new NotFoundException('Not Found');
    }
    if (request) {
      await this.accessRules.assertForBusinessSubdomain(
        requestIp(request),
        subdomain,
      );
    }
    const business = await this.publicService.getBusinessBySubdomain(subdomain);
    return { success: true, data: business };
  }

  @Get('linktrees')
  async getLinktrees(
    @Subdomain() subdomain: string,
    @Req() request?: FastifyRequest,
  ) {
    if (!subdomain) {
      throw new NotFoundException('Not Found');
    }

    if (request) {
      await this.accessRules.assertForBusinessSubdomain(
        requestIp(request),
        subdomain,
      );
    }

    const linktrees =
      await this.publicService.getLinktreesBySubdomain(subdomain);
    return { success: true, data: linktrees };
  }

  @Get('plans')
  async getPlans() {
    return { success: true, data: await this.publicService.getPlans() };
  }

  @Get('platform-theme')
  async getPlatformTheme() {
    return {
      success: true,
      data: await this.publicService.getPlatformTheme(),
    };
  }

  @Get('linktree/:uid')
  async getPublicPage(
    @Param('uid') uid: string,
    @Subdomain() subdomain: string,
    @Req() req: FastifyRequest,
  ) {
    // Reject requests from root domain (no subdomain)
    if (!subdomain || subdomain === 'id') {
      throw new NotFoundException('Not Found');
    }

    await this.accessRules.assertForPublicLinktree(
      requestIp(req),
      subdomain,
      uid,
    );

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      'unknown';

    // Rate limit: 30 requests per minute per IP
    const isLimited = await this.redisService.isRateLimited(
      `rl:public:${clientIp}`,
      30,
      60,
    );
    if (isLimited) {
      throw new HttpException(
        { message: 'Too many requests', retryAfter: 60 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Validate UID format (only lowercase alphanumeric and hyphens)
    if (!/^[a-z0-9-]+$/.test(uid) || uid.length > 50) {
      throw new HttpException('Invalid linktree ID', HttpStatus.BAD_REQUEST);
    }

    // Fetch linktree scoped to the subdomain's business
    const data = await this.publicService.getPublicLinktreeByUidAndSubdomain(
      uid,
      subdomain,
    );
    return { success: true, data };
  }
}
