import { Module } from '@nestjs/common';
import { BusinessAdministrationService } from './business-administration.service';
import { BusinessAdministrationController } from './business-administration.controller';
import { PlatformSettingsController } from './platform-settings.controller';
import { AdvertisingModule } from '../advertising/advertising.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { PlatformSettingsService } from './platform-settings.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AccessRulesController } from './access-rules.controller';
import { AccessRulesService } from './access-rules.service';
import { AccessControlController } from './access-control.controller';
import { AccessControlService } from './access-control.service';
import {
  ApprovalManagementController,
  BillingManagementController,
  BusinessAccessController,
  PermissionCatalogController,
} from './billing-management.controller';
import { BillingManagementService } from './billing-management.service';
import { DataRetentionService } from './data-retention.service';
import { BusinessAdministrationRepository } from './business-administration.repository';
import { BillingRepository } from './billing.repository';
import { AnalyticsReadRepository } from '../analytics/analytics-read.repository';
import { LinktreesModule } from '../linktrees/linktrees.module';
import { PlatformLinktreesController } from './platform-linktrees.controller';
import { PlatformLinktreesService } from './platform-linktrees.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlatformContentWorkspaceModule } from '../platform-workspace/platform-content-workspace.module';
import { MiniWebsitesModule } from '../mini-websites/mini-websites.module';
import { PlatformMiniWebsitesController } from './platform-mini-websites.controller';
import { PlatformMiniWebsitesService } from './platform-mini-websites.service';
import { CreatorAdministrationController } from './creator-administration.controller';
import { CreatorAdministrationService } from './creator-administration.service';

@Module({
  // AdvertisingModule so a plan or subscription change can drop the published
  // advertising payload cached for that business's subdomain.
  imports: [
    AuthModule,
    StorageModule,
    AdvertisingModule,
    LinktreesModule,
    AnalyticsModule,
    PlatformContentWorkspaceModule,
    MiniWebsitesModule,
  ],
  controllers: [
    BusinessAdministrationController,
    PlatformSettingsController,
    AuditLogController,
    AccessRulesController,
    AccessControlController,
    BillingManagementController,
    PermissionCatalogController,
    BusinessAccessController,
    ApprovalManagementController,
    PlatformLinktreesController,
    PlatformMiniWebsitesController,
    CreatorAdministrationController,
  ],
  providers: [
    BusinessAdministrationService,
    BusinessAdministrationRepository,
    BillingRepository,
    // Registered here rather than pulled in with AnalyticsModule: the business
    // analytics modal needs this one repository, not the analytics
    // controllers and the TikTok outbox processor. It depends only on
    // DatabaseService, which is global.
    AnalyticsReadRepository,
    PlatformSettingsService,
    AuditLogService,
    AccessRulesService,
    AccessControlService,
    BillingManagementService,
    DataRetentionService,
    PlatformLinktreesService,
    PlatformMiniWebsitesService,
    CreatorAdministrationService,
  ],
  exports: [
    BusinessAdministrationService,
    PlatformSettingsService,
    AuditLogService,
  ],
})
export class PlatformAdminModule {}
