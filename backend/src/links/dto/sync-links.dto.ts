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

/**
 * The address schemes a link may use.
 *
 * Mirrors the `links_url_check` constraint in `full_schema.sql` exactly. It
 * used to be `@IsUrl({ protocols: ['http', 'https'] })`, which rejected every
 * `tel:`, `mailto:` and `viber://` link — the three the link editor generates
 * for the phone, email and Viber platforms. Saving a page that contained one
 * failed with a bare "Validation failed", so a phone button could be built in
 * the editor and never stored.
 */
const ALLOWED_LINK_URL = /^(https?:\/\/|tel:|mailto:|viber:\/\/)/;

export class SyncLinkItemDto {
  @IsString()
  @MaxLength(80)
  platform!: string;

  @IsString()
  @Matches(ALLOWED_LINK_URL, {
    message: 'url must start with http://, https://, tel:, mailto: or viber://',
  })
  @MaxLength(2048)
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
