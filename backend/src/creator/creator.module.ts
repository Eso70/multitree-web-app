import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { LinktreesModule } from '../linktrees/linktrees.module';
import { MiniWebsitesModule } from '../mini-websites/mini-websites.module';
import { StorageModule } from '../storage/storage.module';
import { CreatorAccountService } from './creator-account.service';
import { CreatorAuthController } from './creator-auth.controller';
import { CreatorAuthService } from './creator-auth.service';
import { CreatorContentController } from './creator-content.controller';
import { CreatorContentService } from './creator-content.service';
import { CreatorGuard } from './creator.guard';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    LinktreesModule,
    MiniWebsitesModule,
    AnalyticsModule,
  ],
  controllers: [CreatorAuthController, CreatorContentController],
  providers: [
    CreatorAuthService,
    CreatorAccountService,
    CreatorContentService,
    CreatorGuard,
  ],
  exports: [CreatorAccountService, CreatorAuthService],
})
export class CreatorModule {}
