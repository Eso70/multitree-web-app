import { Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { TemplateAccessService } from './template-access.service';

@Module({
  providers: [EntitlementService, TemplateAccessService],
  exports: [EntitlementService, TemplateAccessService],
})
export class BillingModule {}
