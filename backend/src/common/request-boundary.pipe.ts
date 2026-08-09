import {
  BadRequestException,
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

const UUID_PARAMETERS = new Set([
  'id',
  'linktreeId',
  'businessId',
  'sessionId',
  'pageId',
  'visitorId',
  'leadId',
  'excludeId',
]);

const INTEGER_QUERY_LIMITS: Record<string, { min: number; max: number }> = {
  page: { min: 1, max: 100_000 },
  limit: { min: 1, max: 500 },
  offset: { min: 0, max: 1_000_000 },
  days: { min: 1, max: 3_650 },
  weeks: { min: 1, max: 104 },
};

const DATE_QUERIES = new Set(['from', 'to']);
const ENUM_QUERY_VALUES: Record<string, ReadonlySet<string>> = {
  pageType: new Set(['linktree', 'mini_website']),
  order: new Set(['asc', 'desc']),
};

@Injectable()
export class RequestBoundaryPipe implements PipeTransform<unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (value === undefined || value === null) return value;

    if (
      metadata.type === 'param' &&
      metadata.data === 'auditId' &&
      (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value))
    ) {
      throw new BadRequestException('Invalid auditId parameter');
    }

    if (
      metadata.type === 'param' &&
      metadata.data === 'catalogId' &&
      (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{0,79}$/.test(value))
    ) {
      throw new BadRequestException('Invalid catalogId parameter');
    }

    if (metadata.type === 'param' && UUID_PARAMETERS.has(metadata.data || '')) {
      if (typeof value !== 'string' || !isUUID(value)) {
        throw new BadRequestException(`Invalid ${metadata.data} parameter`);
      }
    }

    if (metadata.type === 'query' && metadata.data) {
      if (
        UUID_PARAMETERS.has(metadata.data) &&
        (typeof value !== 'string' || !isUUID(value))
      ) {
        throw new BadRequestException(
          `Invalid ${metadata.data} query parameter`,
        );
      }
      if (
        DATE_QUERIES.has(metadata.data) &&
        (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
      ) {
        throw new BadRequestException(
          `Invalid ${metadata.data} query parameter`,
        );
      }
      const allowedValues = ENUM_QUERY_VALUES[metadata.data];
      if (
        allowedValues &&
        (typeof value !== 'string' || !allowedValues.has(value))
      ) {
        throw new BadRequestException(
          `Invalid ${metadata.data} query parameter`,
        );
      }
      const limit = INTEGER_QUERY_LIMITS[metadata.data];
      if (limit && (typeof value !== 'string' || !/^\d+$/.test(value))) {
        throw new BadRequestException(
          `Invalid ${metadata.data} query parameter`,
        );
      }
      if (limit) {
        const parsed = Number(value);
        if (parsed < limit.min || parsed > limit.max) {
          throw new BadRequestException(
            `Invalid ${metadata.data} query parameter`,
          );
        }
      }
    }

    return value;
  }
}
