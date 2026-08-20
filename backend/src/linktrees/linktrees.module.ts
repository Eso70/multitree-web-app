import { Module } from '@nestjs/common';
import { LinktreesService } from './linktrees.service';
import { LinktreesController } from './linktrees.controller';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { LinksModule } from '../links/links.module';
import { BillingModule } from '../billing/billing.module';
import { WebhookModule } from '../api-platform/webhook.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlatformContentWorkspaceModule } from '../platform-workspace/platform-content-workspace.module';

@Module({
  imports: [
    StorageModule,
    AuthModule,
    BillingModule,
    WebhookModule,
    LinksModule,
    // For the per-page view and click totals the pages list shows on each card.
    AnalyticsModule,
    PlatformContentWorkspaceModule,
  ],
  controllers: [LinktreesController],
  providers: [LinktreesService],
  exports: [LinktreesService],
})
export class LinktreesModule {}
