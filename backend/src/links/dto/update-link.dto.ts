import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class UpdateLinkDto {
  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
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
