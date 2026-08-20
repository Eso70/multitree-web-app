import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { IsString, MaxLength } from 'class-validator';

export class ManageCreatorDto {
  @IsIn([
    'suspend',
    'reactivate',
    'activate_paid',
    'cancel_paid',
    'extend_trial',
  ])
  action:
    'suspend' | 'reactivate' | 'activate_paid' | 'cancel_paid' | 'extend_trial';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}

export class ListCreatorsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'suspended', 'expired', 'archived'])
  status?: 'active' | 'suspended' | 'expired' | 'archived';
}
