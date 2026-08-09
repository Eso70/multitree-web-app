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

@Module({
  // AdvertisingModule so a plan or subscription change can drop the published
  // advertising payload cached for that business's subdomain.
  imports: [AuthModule, StorageModule, AdvertisingModule],
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
  ],
  providers: [
    BusinessAdministrationService,
    BusinessAdministrationRepository,
    BillingRepository,
    PlatformSettingsService,
    AuditLogService,
    AccessRulesService,
    AccessControlService,
    BillingManagementService,
    DataRetentionService,
  ],
  exports: [
    BusinessAdministrationService,
    PlatformSettingsService,
    AuditLogService,
  ],
})
export class PlatformAdminModule {}
