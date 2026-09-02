import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { BusinessGuard } from '../auth/business.guard';
import { Capability } from '../auth/capabilities';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import type { SessionUser } from '../auth/session.service';
import { ClientLinktreeAccessService } from './client-linktree-access.service';
import { CreateClientLinktreeInvitationDto } from './dto/create-client-linktree-invitation.dto';

@Controller('api/client-linktree-invitations')
@UseGuards(BusinessGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class BusinessClientLinktreeInvitationsController {
  constructor(private readonly access: ClientLinktreeAccessService) {}

  @Get()
  @RequireCapabilities(Capability.BusinessLinktreesRead)
  async list(@CurrentUser() business: SessionUser) {
    return { success: true, data: await this.access.list(business.id) };
  }

  @Post()
  @RequireCapabilities(Capability.BusinessLinktreesCreate)
  @AuditEvent('business.client-linktree-invitation.create', {
    resourceType: 'client-linktree-invitation',
  })
  async create(
    @Body() body: CreateClientLinktreeInvitationDto,
    @CurrentUser() business: SessionUser,
  ) {
    return {
      success: true,
      data: await this.access.create(business.id, body.clientLabel),
    };
  }

  @Post(':id/revoke-access')
  @HttpCode(HttpStatus.OK)
  @RequireCapabilities(Capability.BusinessLinktreesUpdate)
  @AuditEvent('business.client-linktree-access.revoke', {
    resourceType: 'client-linktree-invitation',
    resourceIdParam: 'id',
  })
  async revokeAccess(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() business: SessionUser,
  ) {
    await this.access.revokeAccess(business.id, id);
    return { success: true };
  }
}
