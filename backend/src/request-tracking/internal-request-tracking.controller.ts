import {
  Body,
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { FrontendRequestEventDto } from './dto/frontend-request-event.dto';
import { RequestTrackingService } from './request-tracking.service';

@Controller('api/internal/request-events')
export class InternalRequestTrackingController {
  constructor(
    private readonly requestTrackingService: RequestTrackingService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(202)
  async record(
    @Headers('x-request-tracking-key') receivedSecret: string | undefined,
    @Body() event: FrontendRequestEventDto,
  ): Promise<void> {
    const expectedSecret =
      this.configService.get<string>('REQUEST_TRACKING_SECRET') ||
      this.configService.get<string>('SESSION_SECRET') ||
      '';
    if (!this.secretsMatch(receivedSecret, expectedSecret)) {
      throw new NotFoundException();
    }
    await this.requestTrackingService.recordFrontendRequest(event);
  }

  private secretsMatch(
    received: string | undefined,
    expected: string,
  ): boolean {
    if (!received || !expected) return false;
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  }
}
