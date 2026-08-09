import { IsIn, IsOptional } from 'class-validator';
import { AdminListQueryDto } from '../../common/dto/admin-list-query.dto';

export class ApiManagementQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['overview', 'clients', 'webhooks', 'policies', 'versions'])
  section: 'overview' | 'clients' | 'webhooks' | 'policies' | 'versions' =
    'overview';
}
