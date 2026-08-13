import {
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  IsUUID,
} from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  subdomain?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  expire_date?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  favicon?: string;

  @IsString()
  @IsOptional()
  default_avatar?: string;

  @IsString()
  @IsOptional()
  website_color?: string;

  @IsString()
  @IsOptional()
  default_footer_text?: string;

  @IsString()
  @IsOptional()
  default_footer_phone?: string;

  @IsString()
  @IsOptional()
  default_template?: string;

  @IsString()
  @IsOptional()
  default_background_color?: string;

  @IsString()
  @IsOptional()
  pixel_id?: string;

  @IsString()
  @IsOptional()
  events_token?: string;

  @IsOptional()
  tiktok_configs?: Array<{ pixel_id?: string; events_token?: string }>;

  @IsOptional()
  default_footer_hidden?: boolean;

  @IsOptional()
  default_whatsapp_enabled?: boolean;

  @IsUUID()
  @IsOptional()
  subscriptionPlanId?: string;

  @IsOptional()
  links?: Array<{
    platform: string;
    url: string;
    display_name?: string | null;
    metadata?: Record<string, unknown>;
  }>;
}
