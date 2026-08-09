import {
  IsEmail,
  IsHexColor,
  IsBoolean,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Max,
  Min,
  ArrayMinSize,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';

export class UpdatePlatformProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  username?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(32)
  @Matches(/^\+?[0-9 ()-]{7,32}$/)
  phone?: string | null;
}

export class UpdateDataRetentionDto {
  @IsInt()
  @Min(7)
  @Max(365)
  request_log_days: number;

  @IsInt()
  @Min(30)
  @Max(730)
  api_history_days: number;

  @IsInt()
  @Min(30)
  @Max(3650)
  communication_history_days: number;

  @IsBoolean()
  automatic_cleanup: boolean;

  @IsInt()
  @Min(0)
  @Max(23)
  cleanup_hour_utc: number;
}

export class RunDataRetentionDto {
  @IsBoolean()
  confirm: boolean;
}

const mediaFormats = ['jpeg', 'png', 'ico'] as const;

export class UpdateMediaSettingsDto {
  @IsInt()
  @Min(1)
  @Max(10)
  max_upload_size_mb: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(mediaFormats, { each: true })
  allowed_formats: Array<(typeof mediaFormats)[number]>;

  @IsBoolean()
  optimize_images: boolean;

  @IsInt()
  @Min(40)
  @Max(100)
  image_quality: number;

  @IsInt()
  @Min(512)
  @Max(4096)
  max_image_dimension: number;

  @IsBoolean()
  auto_cleanup_unused: boolean;

  @IsInt()
  @Min(24)
  @Max(720)
  unused_grace_hours: number;
}

export class RunMediaCleanupDto {
  @IsBoolean()
  confirm: boolean;
}

export class UpdatePlatformBrandingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  logo?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  avatar?: string | null;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  favicon?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(
    /^(?:#[0-9a-fA-F]{3,6}|gradient:(?:to-r|to-l|to-b|to-t|to-br|to-bl|to-tr|to-tl|radial):#[0-9a-fA-F]{3,6}:#[0-9a-fA-F]{3,6})$/,
  )
  accent_color?: string;

  @IsOptional()
  @IsHexColor()
  accent_ink_color?: string;
}
