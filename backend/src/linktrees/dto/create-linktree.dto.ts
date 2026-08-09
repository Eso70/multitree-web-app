import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  MinLength,
} from 'class-validator';

/**
 * Per-link extras a client may send alongside `links`.
 *
 * Every field is `unknown` on purpose: this is unvalidated request data, so the
 * service narrows each value with a `typeof` check before using it.
 */
export type LinkMetadataInput = {
  display_name?: unknown;
  description?: unknown;
  default_message?: unknown;
  metadata?: unknown;
};

export class CreateLinktreeDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  seo_name?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  slug?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  background_color?: string;

  @IsObject()
  @IsOptional()
  template_config?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  footer_text?: string;

  @IsString()
  @IsOptional()
  footer_phone?: string;

  @IsBoolean()
  @IsOptional()
  footer_hidden?: boolean;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @IsArray()
  @IsOptional()
  platforms?: string[];

  @IsObject()
  @IsOptional()
  links?: Record<string, string[]>;

  @IsObject()
  @IsOptional()
  linkMetadata?: Record<string, LinkMetadataInput[]>;
}
