import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AccessRuleQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 10;
  @IsOptional() @IsIn(['deny', 'allow']) effect?: 'deny' | 'allow';
  @IsOptional()
  @IsIn([
    'multitree',
    'platform_admin',
    'business',
    'business_admin',
    'public_linktree',
    'business_api',
  ])
  scope?: string;
  @IsOptional() @IsIn(['all', 'active', 'inactive', 'expired']) status = 'all';
  @IsOptional()
  @IsIn(['newest', 'oldest', 'mostMatched', 'recentlyMatched'])
  sort = 'newest';
  @IsOptional() @IsString() search = '';
}
