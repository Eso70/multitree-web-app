import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  ALLOWED_LINK_URL,
  LINK_URL_MAX_LENGTH,
  LINK_URL_MESSAGE,
} from '../link-url';

export class SyncLinkItemDto {
  @IsString()
  @MaxLength(80)
  platform!: string;

  @IsString()
  @Matches(ALLOWED_LINK_URL, { message: LINK_URL_MESSAGE })
  @MaxLength(LINK_URL_MAX_LENGTH)
  url!: string;

  /**
   * Accepted because the dashboard sends it with every link, and
   * `forbidNonWhitelisted` rejects the whole request over a property the DTO
   * does not name — which failed every save from that screen. Ordering itself
   * comes from array position in `syncLinks`, so the value is not read.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  display_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  default_message?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class SyncLinksDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncLinkItemDto)
  links!: SyncLinkItemDto[];
}

export class BatchSyncLinksDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncLinkItemDto)
  links?: SyncLinkItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncLinkItemDto)
  createLinks?: SyncLinkItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  deleteIds?: string[];
}
