import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum SettingsSection {
  Profile = 'profile',
  Defaults = 'defaults',
  Security = 'security',
  Integrations = 'integrations',
}

export class UpdateSettingsDto {
  @IsEnum(SettingsSection)
  section!: SettingsSection;

  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(80) username?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) logo?: string;
  @IsOptional() @IsString() @MaxLength(500) favicon?: string;
  @IsOptional() @IsString() @MaxLength(500) default_avatar?: string;
  @IsOptional() @IsString() @MaxLength(100) website_color?: string;

  @IsOptional() @IsString() @MaxLength(2000) default_footer_text?: string;
  @IsOptional() @IsString() @MaxLength(40) default_footer_phone?: string;
  @IsOptional() @IsString() @MaxLength(80) default_template?: string;
  @IsOptional() @IsString() @MaxLength(30) default_background_color?: string;
  @IsOptional() @IsBoolean() default_footer_hidden?: boolean;
  @IsOptional() @IsBoolean() default_whatsapp_enabled?: boolean;

  @IsOptional() @IsString() @MaxLength(200) current_password?: string;
  @IsOptional() @IsString() @MaxLength(200) new_password?: string;
  @IsOptional() @IsString() @MaxLength(200) password?: string;
  @IsOptional() @IsString() @MaxLength(200) email?: string;
  @IsOptional() @IsArray() tiktok_configs?: unknown[];
  @IsOptional() @IsString() @MaxLength(100) pixel_id?: string;
  @IsOptional() @IsString() @MaxLength(500) events_token?: string;
}
