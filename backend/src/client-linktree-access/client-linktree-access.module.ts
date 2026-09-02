import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { LinktreesModule } from '../linktrees/linktrees.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StorageModule } from '../storage/storage.module';
import { BusinessClientLinktreeInvitationsController } from './business-client-linktree-invitations.controller';
import { ClientLinktreeAccessController } from './client-linktree-access.controller';
import { ClientLinktreeAccessService } from './client-linktree-access.service';
import { ClientLinktreeSessionGuard } from './client-linktree-session.guard';

@Module({
  imports: [
    AuthModule,
    BillingModule,
    LinktreesModule,
    AnalyticsModule,
    StorageModule,
  ],
  controllers: [
    BusinessClientLinktreeInvitationsController,
    ClientLinktreeAccessController,
  ],
  providers: [ClientLinktreeAccessService, ClientLinktreeSessionGuard],
})
export class ClientLinktreeAccessModule {}
