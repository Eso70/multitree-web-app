import { Module } from '@nestjs/common';
import { PlatformContentWorkspaceService } from './platform-content-workspace.service';

@Module({
  providers: [PlatformContentWorkspaceService],
  exports: [PlatformContentWorkspaceService],
})
export class PlatformContentWorkspaceModule {}
