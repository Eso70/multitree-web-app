import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateTikTokDto {
  @IsOptional()
  @IsString()
  pixel_id?: string;

  @IsOptional()
  @IsString()
  events_token?: string;

  @IsOptional()
  @IsArray()
  tiktok_configs?: Array<{ pixel_id?: string; events_token?: string }>;
}
