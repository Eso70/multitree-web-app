import { IsOptional, IsUUID } from 'class-validator';

export class AuditFilterOptionsQueryDto {
  @IsOptional()
  @IsUUID()
  businessId?: string;
}
