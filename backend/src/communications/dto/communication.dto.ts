import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const ANNOUNCEMENT_TYPES = [
  'general',
  'feature',
  'maintenance',
  'billing',
  'security',
  'urgent',
] as const;
const ANNOUNCEMENT_PRIORITIES = ['normal', 'important', 'critical'] as const;
const AUDIENCE_TYPES = ['all', 'plans', 'businesses'] as const;
const CHANNELS = ['business_bell', 'dashboard_banner', 'homepage'] as const;
const CONVERSATION_CATEGORIES = [
  'account',
  'billing',
  'technical',
  'feature_request',
  'security',
  'verification',
  'other',
] as const;

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message!: string;

  @IsIn(ANNOUNCEMENT_TYPES)
  announcementType!: (typeof ANNOUNCEMENT_TYPES)[number];

  @IsIn(ANNOUNCEMENT_PRIORITIES)
  priority!: (typeof ANNOUNCEMENT_PRIORITIES)[number];

  @IsIn(AUDIENCE_TYPES)
  audienceType!: (typeof AUDIENCE_TYPES)[number];

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  audienceValues!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(CHANNELS, { each: true })
  channels!: Array<(typeof CHANNELS)[number]>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @IsOptional()
  @IsISO8601()
  publishAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsIn(['top_banner', 'feature_card'])
  homepagePlacement?: 'top_banner' | 'feature_card';

  @IsOptional()
  @IsInt()
  @Min(-1000)
  @Max(1000)
  homepagePriority?: number;

  @IsOptional()
  @IsBoolean()
  homepageDismissible?: boolean;
}

export class UpdateAnnouncementDto extends CreateAnnouncementDto {}

export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @IsIn(CONVERSATION_CATEGORIES)
  category!: (typeof CONVERSATION_CATEGORIES)[number];

  @IsOptional()
  @IsIn(['normal', 'important', 'urgent'])
  priority?: 'normal' | 'important' | 'urgent';

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;
}

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsIn([
    'open',
    'waiting_business',
    'waiting_platform',
    'resolved',
    'archived',
  ])
  status?: string;

  @IsOptional()
  @IsIn(['normal', 'important', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsUUID()
  assignedAdminId?: string;
}
