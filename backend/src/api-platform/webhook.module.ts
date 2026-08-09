import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ObservabilityModule } from '../observability/observability.module';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Module({
  imports: [AuthModule, ObservabilityModule],
  providers: [WebhookDeliveryService],
  exports: [WebhookDeliveryService],
})
export class WebhookModule {}
