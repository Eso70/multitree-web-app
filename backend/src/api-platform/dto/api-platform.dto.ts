import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsIP,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CreateLinktreeDto } from '../../linktrees/dto/create-linktree.dto';
import { UpdateLinktreeDto } from '../../linktrees/dto/update-linktree.dto';

export class DeveloperCreateLinktreeDto extends CreateLinktreeDto {
  @IsString() @MaxLength(180) @IsOptional() externalId?: string;
}

export class DeveloperUpdateLinktreeDto extends UpdateLinktreeDto {
  @IsString() @MaxLength(180) @IsOptional() externalId?: string;
}

export class CreateApiClientDto {
  @IsUUID() businessId: string;
  @IsString() @MinLength(3) @MaxLength(120) name: string;
  @IsIn(['production', 'sandbox']) environment: 'production' | 'sandbox';
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) scopes: string[];
  @IsISO8601() expiresAt: string;
  @IsArray()
  @ArrayMaxSize(50)
  @IsIP(undefined, { each: true })
  @IsOptional()
  ipAllowlist?: string[];
}

export class UpdateApiClientStatusDto {
  @IsIn(['active', 'suspended', 'revoked']) status:
    'active' | 'suspended' | 'revoked';
}

export class CreateWebhookDto {
  @IsUUID() businessId: string;
  @IsString() @MinLength(3) @MaxLength(120) name: string;
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url: string;
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) events: string[];
}

export class UpdateWebhookStatusDto {
  @IsIn(['active', 'paused', 'disabled']) status:
    'active' | 'paused' | 'disabled';
}

export class UpdateRatePolicyDto {
  @IsInt() @Min(1) @Max(100000) requestsPerMinute: number;
  @IsInt() @Min(-1) requestsMonthly: number;
  @IsInt() @Min(-1) @Max(10000) apiClientLimit: number;
  @IsInt() @Min(-1) @Max(10000) webhookEndpointLimit: number;
  @IsInt() @Min(1) @Max(100) @IsOptional() warningThreshold?: number;
  @IsBoolean() @IsOptional() autoSuspend?: boolean;
}

export class UpdateCatalogGroupDto {
  @IsBoolean() enabled: boolean;
}

export class ValidateWebhookDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url: string;
}

export class CreateApiVersionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  version: string;

  @IsIn(['current', 'supported', 'deprecated'])
  status: 'current' | 'supported' | 'deprecated';

  @IsISO8601()
  releasedAt: string;

  @IsISO8601()
  @IsOptional()
  retirementAt?: string;
}

export class CloneLinktreeDto {
  @IsString() @MinLength(2) @MaxLength(255) name: string;
  @IsString() @MinLength(2) @MaxLength(100) slug: string;
  @IsString() @MaxLength(180) @IsOptional() externalId?: string;
}

export class ScheduleLinktreeDto {
  @IsIn(['publish', 'unpublish']) action: 'publish' | 'unpublish';
  @IsISO8601() executeAt: string;
}

export class BulkLinktreeDto {
  @IsArray() @ArrayMaxSize(100) @IsObject({ each: true }) operations: Array<{
    action: 'create' | 'update';
    id?: string;
    data: Record<string, unknown>;
    externalId?: string;
  }>;
}
