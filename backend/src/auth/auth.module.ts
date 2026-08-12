import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { StorageModule } from '../storage/storage.module';
import { ApprovalService } from './approval.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthorizationGuard } from './authorization.guard';
import { AuthorizationService } from './authorization.service';
import { BusinessGuard } from './business.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAuthController } from './platform-auth.controller';
import { SecretCryptoService } from './secret-crypto.service';
import { SecurityAuditService } from './security-audit.service';
import { SessionService } from './session.service';
import { AccessRuleEnforcementService } from './access-rule-enforcement.service';
import { GoogleIdentityService } from './google-identity.service';
import { ImpersonationService } from './impersonation.service';

@Module({
  imports: [BillingModule, StorageModule],
  controllers: [AuthController, PlatformAuthController],
  providers: [
    AuthService,
    SessionService,
    BusinessGuard,
    PlatformAdminGuard,
    AuthorizationGuard,
    AuthorizationService,
    ApprovalService,
    SecretCryptoService,
    SecurityAuditService,
    AuditInterceptor,
    AccessRuleEnforcementService,
    GoogleIdentityService,
    ImpersonationService,
  ],
  exports: [
    SessionService,
    BusinessGuard,
    PlatformAdminGuard,
    AuthorizationGuard,
    AuthorizationService,
    ApprovalService,
    SecretCryptoService,
    SecurityAuditService,
    AuditInterceptor,
    AccessRuleEnforcementService,
    GoogleIdentityService,
    ImpersonationService,
  ],
})
export class AuthModule {}
