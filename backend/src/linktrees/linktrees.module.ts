import { Module } from '@nestjs/common';
import { LinktreesService } from './linktrees.service';
import { LinktreesController } from './linktrees.controller';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { LinksModule } from '../links/links.module';
import { BillingModule } from '../billing/billing.module';
import { WebhookModule } from '../api-platform/webhook.module';

@Module({
  imports: [
    StorageModule,
    AuthModule,
    BillingModule,
    WebhookModule,
    LinksModule,
  ],
  controllers: [LinktreesController],
  providers: [LinktreesService],
  exports: [LinktreesService],
})
export class LinktreesModule {}
