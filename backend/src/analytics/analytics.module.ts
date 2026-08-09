import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { TikTokOutboxProcessor } from './tiktok/tiktok-outbox.processor';
import {
  BusinessUnifiedAnalyticsController,
  PublicUnifiedAnalyticsController,
} from './unified-analytics.controller';
import { UnifiedAnalyticsService } from './unified-analytics.service';
import { AnalyticsReadService } from './analytics-read.service';
import { AnalyticsReadRepository } from './analytics-read.repository';
import { PublicPageAnalyticsService } from './public-page-analytics.service';
import { BillingModule } from '../billing/billing.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [AuthModule, BillingModule, ObservabilityModule],
  controllers: [
    AnalyticsController,
    PublicUnifiedAnalyticsController,
    BusinessUnifiedAnalyticsController,
  ],
  providers: [
    AnalyticsReadService,
    AnalyticsReadRepository,
    UnifiedAnalyticsService,
    PublicPageAnalyticsService,
    TikTokOutboxProcessor,
  ],
  exports: [
    AnalyticsReadService,
    UnifiedAnalyticsService,
    PublicPageAnalyticsService,
  ],
})
export class AnalyticsModule {}
