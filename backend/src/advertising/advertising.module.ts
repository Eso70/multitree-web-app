import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import {
  AdvertisingController,
  PublicAdvertisingController,
} from './advertising.controller';
import { AdvertisingRepository } from './advertising.repository';
import { AdvertisingService } from './advertising.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [AdvertisingController, PublicAdvertisingController],
  providers: [AdvertisingRepository, AdvertisingService],
  exports: [AdvertisingService],
})
export class AdvertisingModule {}
