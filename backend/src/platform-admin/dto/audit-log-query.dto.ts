import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ACTOR_TYPES = [
  'anonymous',
  'business',
  'creator',
  'platform-admin',
  'multitree',
];
const OUTCOMES = ['success', 'failure', 'denied'];
const SORT_OPTIONS = [
  'newest',
  'oldest',
  'failure-first',
  'denied-first',
  'success-first',
  'business-first',
  'views-first',
  'clicks-first',
  'requests-first',
  'integrations-first',
  'slowest-first',
];
const KINDS = [
  'audit',
  'request',
  'view',
  'click',
  'integration',
  'tiktok-pixel',
  'tiktok-events-api',
];
const SOURCES = ['frontend', 'backend'];
const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

export class AuditLogQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(10)
  @Max(100)
  pageSize = 25;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(ACTOR_TYPES)
  actorType?: string;

  @IsOptional()
  @IsIn(OUTCOMES)
  outcome?: string;

  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort = 'newest';

  @IsOptional()
  @IsIn(KINDS)
  kind?: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsOptional()
  @IsUUID()
  linktreeId?: string;

  @IsOptional()
  @IsIn(SOURCES)
  source?: string;

  @IsOptional()
  @IsIn(HTTP_METHODS)
  httpMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  eventType?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
