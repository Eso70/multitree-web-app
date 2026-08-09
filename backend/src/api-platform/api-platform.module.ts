import { Module } from '@nestjs/common';
import { LinktreesModule } from '../linktrees/linktrees.module';
import { LinksModule } from '../links/links.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StorageModule } from '../storage/storage.module';
import { CommunicationModule } from '../communications/communication.module';
import { ApiKeyGuard } from './api-key.guard';
import { ApiScopeGuard } from './api-scope.guard';
import { ApiUsageInterceptor } from './api-usage.interceptor';
import { IdempotencyService } from './idempotency.service';
import { WebhookModule } from './webhook.module';
import { ApiManagementService } from './api-management.service';
import { DeveloperApiService } from './developer-api.service';
import { ApiManagementController } from './api-management.controller';
import { DeveloperApiController } from './developer-api.controller';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    WebhookModule,
    AuthModule,
    BillingModule,
    LinktreesModule,
    LinksModule,
    AnalyticsModule,
    StorageModule,
    CommunicationModule,
  ],
  controllers: [ApiManagementController, DeveloperApiController],
  providers: [
    ApiKeyGuard,
    ApiScopeGuard,
    ApiUsageInterceptor,
    IdempotencyService,
    ApiManagementService,
    DeveloperApiService,
  ],
})
export class ApiPlatformModule {}
