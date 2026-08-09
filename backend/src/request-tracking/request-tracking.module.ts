import { Module } from '@nestjs/common';
import { InternalRequestTrackingController } from './internal-request-tracking.controller';
import { RequestTrackingService } from './request-tracking.service';

@Module({
  controllers: [InternalRequestTrackingController],
  providers: [RequestTrackingService],
  exports: [RequestTrackingService],
})
export class RequestTrackingModule {}
