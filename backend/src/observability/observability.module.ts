import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { InternalOperationsGuard } from './internal-operations.guard';
import { OperationalMetricsService } from './operational-metrics.service';

@Module({
  imports: [StorageModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    InternalOperationsGuard,
    OperationalMetricsService,
  ],
  exports: [OperationalMetricsService],
})
export class ObservabilityModule {}
