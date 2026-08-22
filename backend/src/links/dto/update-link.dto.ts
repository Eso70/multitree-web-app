import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ALLOWED_LINK_URL,
  LINK_URL_MAX_LENGTH,
  LINK_URL_MESSAGE,
} from '../link-url';

export class UpdateLinkDto {
  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  @Matches(ALLOWED_LINK_URL, { message: LINK_URL_MESSAGE })
  @MaxLength(LINK_URL_MAX_LENGTH)
  url?: string;

  @IsString()
  @IsOptional()
  display_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  default_message?: string;

  @IsNumber()
  @IsOptional()
  display_order?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
