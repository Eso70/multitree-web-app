import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageDriver } from './local-storage.driver';
import { STORAGE_DRIVER } from './storage.driver';

@Module({
  providers: [
    LocalStorageDriver,
    { provide: STORAGE_DRIVER, useExisting: LocalStorageDriver },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
