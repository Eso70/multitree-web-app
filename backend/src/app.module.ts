import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LinktreesModule } from './linktrees/linktrees.module';
import { LinksModule } from './links/links.module';
import { PublicModule } from './public/public.module';
import { StorageModule } from './storage/storage.module';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestTrackingModule } from './request-tracking/request-tracking.module';
import { CommunicationModule } from './communications/communication.module';
import { ApiPlatformModule } from './api-platform/api-platform.module';
import { MiniWebsitesModule } from './mini-websites/mini-websites.module';
import { AdvertisingModule } from './advertising/advertising.module';
import { ObservabilityModule } from './observability/observability.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    ObservabilityModule,
    CommunicationModule,
    ApiPlatformModule,
    AuthModule,
    AnalyticsModule,
    LinktreesModule,
    MiniWebsitesModule,
    AdvertisingModule,
    LinksModule,
    PublicModule,
    StorageModule,
    PlatformAdminModule,
    RequestTrackingModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
