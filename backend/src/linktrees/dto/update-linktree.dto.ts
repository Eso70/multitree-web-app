import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
} from 'class-validator';

export class UpdateLinktreeDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  seo_name?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
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
}
