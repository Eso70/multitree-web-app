import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { InternalOperationsGuard } from './internal-operations.guard';
import { OperationalMetricsService } from './operational-metrics.service';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  @Get('health/live')
  liveness() {
    return { status: 'alive' as const };
  }

  @Get('health/ready')
  @UseGuards(InternalOperationsGuard)
  async readiness() {
    const result = await this.health.readiness();
    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  @Get('internal/metrics')
  @UseGuards(InternalOperationsGuard)
  getMetrics() {
    return this.metrics.snapshot();
  }
}
