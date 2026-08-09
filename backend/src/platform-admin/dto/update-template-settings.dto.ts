import { IsObject, IsOptional } from 'class-validator';

export class UpdateTemplateSettingsDto {
  @IsOptional()
  @IsObject()
  widget_config?: Record<string, unknown>;
}
