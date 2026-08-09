import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { IsUUID } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  subdomain: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsUUID()
  @IsOptional()
  subscriptionPlanId?: string;

  @IsDateString()
  @IsOptional()
  expire_date?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  logo?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  favicon?: string;

  @IsString()
  @MinLength(1)
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
}
