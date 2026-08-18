import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { BillingModule } from '../billing/billing.module';
import {
  MiniWebsitesController,
  PublicMiniWebsitesController,
} from './mini-websites.controller';
import { MiniWebsiteLeadsService } from './mini-website-leads.service';
import { MiniWebsitesService } from './mini-websites.service';
import { MiniWebsitesRepository } from './mini-websites.repository';

@Module({
  // Lead form submissions are handed to the shared analytics ingest, which is
  // what creates the encrypted CRM contact and queues the TikTok conversion.
  imports: [AnalyticsModule, AuthModule, BillingModule, StorageModule],
  controllers: [MiniWebsitesController, PublicMiniWebsitesController],
  providers: [
    MiniWebsitesRepository,
    MiniWebsitesService,
    MiniWebsiteLeadsService,
  ],
  exports: [MiniWebsitesService],
})
export class MiniWebsitesModule {}
