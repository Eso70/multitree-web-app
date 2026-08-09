import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';

export class CreateEntitlementDto {
  @IsString()
  @Matches(/^(feature|limit|retention|service)\.[a-z][a-z0-9._-]*$/)
  key: string;
  @IsString() @Length(2, 120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsIn(['boolean', 'integer', 'string']) valueType:
    'boolean' | 'integer' | 'string';
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
}

export class UpdateEntitlementDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}

export class CreatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9-]*$/)
  code?: string;
  @IsString() @Length(2, 120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'archived']) status?: string;
  @IsString() @Matches(/^[A-Z]{3}$/) currency: string;
  @IsInt() @Min(0) yearlyPriceMinor: number;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?: number;
  @IsOptional() @IsInt() @Min(-32768) @Max(32767) displayOrder?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsObject() entitlements?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID(undefined, { each: true })
  permissionIds?: string[];
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsIn(['active', 'inactive', 'archived']) status?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsInt() @Min(0) yearlyPriceMinor?: number;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?: number;
  @IsOptional() @IsInt() @Min(-32768) @Max(32767) displayOrder?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsObject() entitlements?: Record<string, unknown>;
}

export class UpdatePermissionProfileDto {
  @IsString() @Length(2, 120) name: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID(undefined, { each: true })
  permissionIds: string[];
}

export class CreateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9-]*$/)
  code?: string;
  @IsString() @Length(2, 120) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsUUID() permissionProfileId: string;
  @IsOptional()
  @IsIn(['active', 'inactive', 'archived'])
  status?: 'active' | 'inactive' | 'archived';
  @IsString() @Matches(/^[A-Z]{3}$/) currency: string;
  @IsInt() @Min(0) yearlyPriceMinor: number;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?: number;
  @IsOptional() @IsInt() @Min(-32768) @Max(32767) displayOrder?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() permissionProfileId?: string;
  @IsOptional()
  @IsIn(['active', 'inactive', 'archived'])
  status?: 'active' | 'inactive' | 'archived';
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsInt() @Min(0) yearlyPriceMinor?: number;
  @IsOptional() @IsInt() @Min(0) @Max(365) trialDays?: number;
  @IsOptional() @IsInt() @Min(-32768) @Max(32767) displayOrder?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpsertBusinessSubscriptionDto {
  @IsUUID() businessId: string;
  @IsOptional() @IsUUID() subscriptionPlanId?: string;
  @IsOptional() @IsUUID() planId?: string;
  @IsIn([
    'trialing',
    'active',
    'past_due',
    'grace_period',
    'paused',
    'canceled',
    'expired',
    'incomplete',
  ])
  status: string;
  @IsOptional() @IsISO8601() currentPeriodStart?: string;
  @IsOptional() @IsISO8601() currentPeriodEnd?: string;
}

export class UpdatePlanConfigurationDto {
  @IsOptional() @IsObject() permissions?: Record<string, unknown>;
  @IsOptional() @IsObject() entitlements?: Record<string, unknown>;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  templateKeys?: string[];
}

export class ReviewApprovalDto {
  @IsOptional() @IsString() @Length(3, 500) rejectionReason?: string;
}
