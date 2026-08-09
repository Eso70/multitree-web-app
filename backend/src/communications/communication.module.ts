import { Module } from '@nestjs/common';
import {
  BusinessCommunicationController,
  PlatformCommunicationController,
  PublicCommunicationController,
} from './communication.controller';
import { CommunicationService } from './communication.service';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [AuthModule, ObservabilityModule],
  controllers: [
    PlatformCommunicationController,
    BusinessCommunicationController,
    PublicCommunicationController,
  ],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
