import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlatformContentWorkspaceModule } from '../platform-workspace/platform-content-workspace.module';

@Module({
  imports: [AuthModule, AnalyticsModule, PlatformContentWorkspaceModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
