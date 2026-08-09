import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateAccessRuleDto {
  @IsIn(['deny', 'allow']) effect: 'deny' | 'allow';
  @IsIn([
    'multitree',
    'platform_admin',
    'business',
    'business_admin',
    'public_linktree',
    'business_api',
  ])
  scope: string;
  @IsString() @Length(2, 64) ipNetwork: string;
  @IsOptional() @IsUUID() businessId?: string;
  @IsOptional() @IsUUID() linktreeId?: string;
  @IsString() @Length(3, 500) reason: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}
