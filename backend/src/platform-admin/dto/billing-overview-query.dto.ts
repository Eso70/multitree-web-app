import { IsOptional, IsUUID } from 'class-validator';
import { AdminListQueryDto } from '../../common/dto/admin-list-query.dto';

export class BillingOverviewQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsUUID()
  planId?: string;
}
