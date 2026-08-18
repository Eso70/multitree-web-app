import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  MINI_WEBSITE_MAX_PLANS,
  MINI_WEBSITE_MAX_PAYMENT_METHODS,
  MINI_WEBSITE_VISUAL_TEMPLATE_KEYS,
} from '../mini-website.constants';

export class SaveMiniWebsiteDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/)
  slug?: string;
  @IsOptional() @IsString() @MaxLength(240) headline?: string;
  @IsOptional() @IsString() @MaxLength(4000) bio?: string;
  @IsOptional() @IsString() avatar?: string | null;
  @IsOptional() @IsString() cover?: string | null;
  @IsOptional()
  @IsIn(MINI_WEBSITE_VISUAL_TEMPLATE_KEYS)
  templateKey?: string;
  @IsOptional() @IsIn(['soft', 'glass', 'minimal', 'warm']) variation?: string;
  @IsOptional()
  @IsIn([
    'none',
    'grid',
    'grid45',
    'dots',
    'diagonal',
    'cross',
    'circles',
    'waves',
    'zigzag',
  ])
  backgroundStyle?: string;
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z][A-Za-z]{0,79}$/)
  professionTemplate?: string;
  @IsOptional()
  @IsString()
  @Matches(
    /^(?:#[0-9a-fA-F]{6}|gradient:(?:to-r|to-l|to-b|to-t|to-br|to-bl|to-tr|to-tl|radial):#[0-9a-fA-F]{6}:#[0-9a-fA-F]{6})$/,
  )
  accentColor?: string;
  @IsOptional()
  @IsIn(['draft', 'published', 'paused', 'archived'])
  status?: string;
  @IsOptional()
  @IsIn(['none', 'whatsapp', 'call', 'booking'])
  primaryAction?: string;
  @IsOptional() @IsString() @MaxLength(30) whatsappNumber?: string;
  @IsOptional()
  @IsIn(['Contact', 'Lead', 'InitiateCheckout', 'CompletePayment'])
  pixelEvent?: string;
  @IsOptional() @IsNumber() @Min(0) eventValue?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsObject({ each: true })
  socialLinks?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsObject({ each: true })
  sections?: Array<{ key: string; enabled: boolean }>;
  @IsOptional() @IsObject() location?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsObject({ each: true })
  locations?: Array<Record<string, unknown>>;
  // One entry per weekday; anything longer is a client that has lost the plot.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsObject({ each: true })
  hours?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsObject({ each: true })
  gallery?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  faq?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsObject({ each: true })
  services?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsObject({ each: true })
  bookings?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsObject({ each: true })
  team?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  certificates?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  videos?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsObject({ each: true })
  youtubeVideos?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  stories?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsObject({ each: true })
  partners?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsObject({ each: true })
  reviews?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsObject({ each: true })
  beforeAfter?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsObject({ each: true })
  coverage?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MINI_WEBSITE_MAX_PAYMENT_METHODS)
  @IsObject({ each: true })
  paymentMethods?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  specialOffers?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  events?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  audio?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  advantages?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  impactStats?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  processSteps?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsObject({ each: true })
  documents?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  ownedProperties?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  education?: Array<Record<string, unknown>>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsObject({ each: true })
  experience?: Array<Record<string, unknown>>;
  @IsOptional() @IsObject() leadForm?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MINI_WEBSITE_MAX_PLANS)
  @IsObject({ each: true })
  plans?: Array<Record<string, unknown>>;
  @IsOptional() @IsObject() content?: Record<string, unknown>;
}
