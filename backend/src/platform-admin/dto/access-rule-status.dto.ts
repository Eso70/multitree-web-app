import { IsEnum } from 'class-validator';

export enum AccessRuleStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export class AccessRuleStatusDto {
  @IsEnum(AccessRuleStatus)
  status!: AccessRuleStatus;
}
