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
import { CommunicationModule } from '../communications/communication.module';

@Module({
  // CommunicationModule so a permanent TikTok delivery failure can reach the
  // platform administrators' notification centre.
  imports: [
    AuthModule,
    BillingModule,
    ObservabilityModule,
    CommunicationModule,
  ],
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
    AnalyticsReadRepository,
    AnalyticsReadService,
    UnifiedAnalyticsService,
    PublicPageAnalyticsService,
  ],
})
export class AnalyticsModule {}
