import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import {
  BusinessSignupController,
  GoogleBusinessAuthController,
  PlatformGoogleAuthController,
  PlatformSignupController,
} from './business-onboarding.controller';
import { BusinessOnboardingService } from './business-onboarding.service';
import { MailModule } from '../mail/mail.module';
import { CreatorModule } from '../creator/creator.module';

@Module({
  imports: [AuthModule, StorageModule, MailModule, CreatorModule],
  controllers: [
    GoogleBusinessAuthController,
    PlatformGoogleAuthController,
    BusinessSignupController,
    PlatformSignupController,
  ],
  providers: [BusinessOnboardingService],
})
export class OnboardingModule {}
