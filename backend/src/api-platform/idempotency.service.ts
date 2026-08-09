import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { DatabaseService } from '../database/database.service';
import type { ApiPrincipal } from './api-platform.types';

@Injectable()
export class IdempotencyService {
  constructor(private readonly database: DatabaseService) {}

  async execute<T>(
    principal: ApiPrincipal,
    key: string | undefined,
    fingerprint: unknown,
    operation: () => Promise<T>,
  ): Promise<{ value: T; replayed: boolean }> {
    if (!key) return { value: await operation(), replayed: false };
    if (!/^[A-Za-z0-9._:-]{8,160}$/.test(key)) {
      throw new ConflictException({
        code: 'invalid_idempotency_key',
        message: 'Idempotency-Key must be 8-160 safe characters',
      });
    }
    const requestHash = createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
    const inserted = await this.database.query(
      `INSERT INTO api_idempotency_keys(client_id,business_id,idempotency_key,request_hash)
       VALUES($1,$2,$3,$4) ON CONFLICT(client_id,idempotency_key) DO NOTHING RETURNING id`,
      [principal.clientId, principal.businessId, key, requestHash],
    );
    if (!inserted.rowCount) {
      const existing = await this.database.query<{
        request_hash: string;
        response_body: T | null;
        completed_at: string | null;
      }>(
        `SELECT request_hash,response_body,completed_at::text FROM api_idempotency_keys
         WHERE client_id=$1 AND idempotency_key=$2 AND expires_at>now()`,
        [principal.clientId, key],
      );
      const row = existing.rows[0];
      if (!row || row.request_hash !== requestHash) {
        throw new ConflictException({
          code: 'idempotency_conflict',
          message: 'Idempotency key was used for a different request',
        });
      }
      if (!row.completed_at || row.response_body === null) {
        throw new ConflictException({
          code: 'request_in_progress',
          message: 'A request with this idempotency key is still processing',
        });
      }
      return { value: row.response_body, replayed: true };
    }
    try {
      const value = await operation();
      await this.database.query(
        `UPDATE api_idempotency_keys SET response_status=200,response_body=$3::jsonb,completed_at=now()
         WHERE client_id=$1 AND idempotency_key=$2`,
        [principal.clientId, key, JSON.stringify(value)],
      );
      return { value, replayed: false };
    } catch (error) {
      await this.database.query(
        `DELETE FROM api_idempotency_keys WHERE client_id=$1 AND idempotency_key=$2 AND completed_at IS NULL`,
        [principal.clientId, key],
      );
      throw error;
    }
  }
}
