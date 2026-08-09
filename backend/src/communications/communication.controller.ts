import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { BusinessGuard } from '../auth/business.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session.service';
import { AuditInterceptor } from '../auth/audit.interceptor';
import { AuditEvent } from '../auth/audit-event.decorator';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { Capability } from '../auth/capabilities';
import { RequireCapabilities } from '../auth/require-capabilities.decorator';
import { CommunicationService } from './communication.service';
import {
  CreateAnnouncementDto,
  CreateConversationDto,
  CreateMessageDto,
  UpdateAnnouncementDto,
  UpdateConversationDto,
} from './dto/communication.dto';

@Controller('api/platform/communications')
@UseGuards(PlatformAdminGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class PlatformCommunicationController {
  constructor(private readonly communications: CommunicationService) {}

  @Get('overview')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async overview() {
    return { success: true, data: await this.communications.getOverview() };
  }

  @Get('announcements')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async announcements(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') rawLimit?: string,
  ) {
    return {
      success: true,
      data: await this.communications.listAnnouncements({
        status,
        search,
        limit: Number(rawLimit) || 100,
      }),
    };
  }

  @Get('announcements/:id')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async announcement(@Param('id') id: string) {
    return {
      success: true,
      data: await this.communications.getAnnouncement(id),
    };
  }

  @Post('announcements')
  @RequireCapabilities(Capability.PlatformCommunicationsAnnouncementCreate)
  @AuditEvent('platform.communication.announcement.create', {
    resourceType: 'announcement',
  })
  async createAnnouncement(
    @Body() body: CreateAnnouncementDto,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.communications.createAnnouncement(body, user),
    };
  }

  @Put('announcements/:id')
  @RequireCapabilities(Capability.PlatformCommunicationsAnnouncementCreate)
  @AuditEvent('platform.communication.announcement.update', {
    resourceType: 'announcement',
    resourceIdParam: 'id',
  })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    return {
      success: true,
      data: await this.communications.updateAnnouncement(id, body),
    };
  }

  @Post('announcements/:id/publish')
  @RequireCapabilities(Capability.PlatformCommunicationsAnnouncementPublish)
  @HttpCode(HttpStatus.OK)
  @AuditEvent('platform.communication.announcement.publish', {
    resourceType: 'announcement',
    resourceIdParam: 'id',
  })
  async publishAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.communications.publishAnnouncement(id, user.id),
    };
  }

  @Delete('announcements/:id')
  @RequireCapabilities(Capability.PlatformCommunicationsAnnouncementArchive)
  @AuditEvent('platform.communication.announcement.archive', {
    resourceType: 'announcement',
    resourceIdParam: 'id',
  })
  async archiveAnnouncement(@Param('id') id: string) {
    return {
      success: true,
      data: await this.communications.archiveAnnouncement(id),
    };
  }

  @Get('notifications')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async notifications(
    @CurrentUser() user: SessionUser,
    @Query('limit') rawLimit?: string,
  ) {
    return {
      success: true,
      data: await this.communications.listNotifications(
        user,
        Number(rawLimit) || 30,
      ),
    };
  }

  @Patch('notifications/read-all')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async readAllNotifications(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.communications.markAllNotificationsRead(user),
    };
  }

  @Patch('notifications/:id/read')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async readNotification(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.communications.markNotificationRead(user, id),
    };
  }

  @Delete('notifications/:id')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
  ) {
    return {
      success: true,
      data: await this.communications.archiveNotification(user, id),
    };
  }

  @Delete('notifications')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async deleteAllNotifications(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.communications.archiveAllNotifications(user),
    };
  }

  @Get('conversations')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async conversations(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
  ) {
    return {
      success: true,
      data: await this.communications.listConversations(user, status),
    };
  }

  @Post('conversations')
  @RequireCapabilities(Capability.PlatformCommunicationsConversationReply)
  @AuditEvent('platform.communication.conversation.create', {
    resourceType: 'conversation',
  })
  async createConversation(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateConversationDto,
  ) {
    return {
      success: true,
      data: await this.communications.createConversation(user, body),
    };
  }

  @Get('conversations/:id')
  @RequireCapabilities(Capability.PlatformCommunicationsRead)
  async conversation(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    return {
      success: true,
      data: await this.communications.getConversation(user, id),
    };
  }

  @Post('conversations/:id/messages')
  @RequireCapabilities(Capability.PlatformCommunicationsConversationReply)
  @AuditEvent('platform.communication.message.create', {
    resourceType: 'conversation',
    resourceIdParam: 'id',
  })
  async reply(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: CreateMessageDto,
  ) {
    return {
      success: true,
      data: await this.communications.replyToConversation(user, id, body),
    };
  }

  @Patch('conversations/:id')
  @RequireCapabilities(Capability.PlatformCommunicationsConversationReply)
  @AuditEvent('platform.communication.conversation.update', {
    resourceType: 'conversation',
    resourceIdParam: 'id',
  })
  async updateConversation(
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
  ) {
    return {
      success: true,
      data: await this.communications.updateConversation(id, body),
    };
  }
}

@Controller('api/auth/communications')
@UseGuards(BusinessGuard)
@UseInterceptors(AuditInterceptor)
export class BusinessCommunicationController {
  constructor(private readonly communications: CommunicationService) {}

  @Get('notifications')
  async notifications(
    @CurrentUser() user: SessionUser,
    @Query('limit') rawLimit?: string,
  ) {
    return {
      success: true,
      data: await this.communications.listNotifications(
        user,
        Number(rawLimit) || 30,
      ),
    };
  }

  @Patch('notifications/read-all')
  async readAllNotifications(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.communications.markAllNotificationsRead(user),
    };
  }

  @Patch('notifications/:id/read')
  async readNotification(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    return {
      success: true,
      data: await this.communications.markNotificationRead(user, id),
    };
  }

  @Delete('notifications/:id')
  async deleteNotification(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    return {
      success: true,
      data: await this.communications.archiveNotification(user, id),
    };
  }

  @Delete('notifications')
  async deleteAllNotifications(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.communications.archiveAllNotifications(user),
    };
  }

  @Get('banners')
  async banners(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.communications.listBusinessBanners(user.id),
    };
  }

  @Get('conversations')
  async conversations(@CurrentUser() user: SessionUser) {
    return {
      success: true,
      data: await this.communications.listConversations(user),
    };
  }

  @Post('conversations')
  @AuditEvent('business.communication.conversation.create', {
    resourceType: 'conversation',
  })
  async createConversation(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateConversationDto,
  ) {
    return {
      success: true,
      data: await this.communications.createConversation(user, body),
    };
  }

  @Get('conversations/:id')
  async conversation(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    return {
      success: true,
      data: await this.communications.getConversation(user, id),
    };
  }

  @Post('conversations/:id/messages')
  @AuditEvent('business.communication.message.create', {
    resourceType: 'conversation',
    resourceIdParam: 'id',
  })
  async reply(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: CreateMessageDto,
  ) {
    return {
      success: true,
      data: await this.communications.replyToConversation(user, id, body),
    };
  }
}

@Controller('api/public/communications')
export class PublicCommunicationController {
  constructor(private readonly communications: CommunicationService) {}

  @Get('homepage')
  async homepage() {
    return {
      success: true,
      data: await this.communications.listHomepageCommunications(),
    };
  }
}
