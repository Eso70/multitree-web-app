import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TikTokPixelConfigDto {
  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F-]{36}$/)
  id?: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,255}$/)
  pixel_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  events_token?: string;

  @IsOptional()
  @IsBoolean()
  keep_events_token?: boolean;
}

export class UpdateTikTokPixelConfigsDto {
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => TikTokPixelConfigDto)
  tiktok_configs: TikTokPixelConfigDto[];
}
