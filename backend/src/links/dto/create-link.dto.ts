import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';

export class CreateLinkDto {
  @IsUUID()
  linktree_id: string;

  @IsString()
  platform: string;

  @IsString()
  url: string;

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
