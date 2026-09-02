import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { BillingModule } from '../billing/billing.module';
import {
  MiniWebsitesController,
  PublicMiniWebsitesController,
} from './mini-websites.controller';
import { MiniWebsitesService } from './mini-websites.service';
import { MiniWebsitesRepository } from './mini-websites.repository';
import { PlatformContentWorkspaceModule } from '../platform-workspace/platform-content-workspace.module';

@Module({
  imports: [
    AnalyticsModule,
    AuthModule,
    BillingModule,
    StorageModule,
    PlatformContentWorkspaceModule,
  ],
  controllers: [MiniWebsitesController, PublicMiniWebsitesController],
  providers: [MiniWebsitesRepository, MiniWebsitesService],
  exports: [MiniWebsitesService],
})
export class MiniWebsitesModule {}
