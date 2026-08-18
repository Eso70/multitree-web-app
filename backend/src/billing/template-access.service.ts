import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TemplateAccessService {
  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async getEffectiveKeys(businessId: string): Promise<string[]> {
    const cacheKey = `templates:v2:business:${businessId}`;
    const cached = await this.redis.get<{ keys: string[] }>(cacheKey);
    if (cached?.keys) return cached.keys;
    const result = await this.database.query<{ template_key: string }>(
      `SELECT template.template_key
         FROM business_subscriptions subscription
         JOIN billing_plan_templates template
           ON template.plan_configuration_id =
              subscription.plan_configuration_id
         WHERE subscription.business_id = $1::uuid
         ORDER BY template.template_key`,
      [businessId],
    );
    const keys = result.rows.map((row) => row.template_key);
    await this.redis.set(cacheKey, { keys }, 60);
    return keys;
  }

  async assertAllowed(businessId: string, templateKey: string): Promise<void> {
    if (!(await this.getEffectiveKeys(businessId)).includes(templateKey)) {
      throw new ForbiddenException(
        'This template is not included in your access policy',
      );
    }
  }

  async invalidate(businessId: string): Promise<void> {
    await this.redis.del(`templates:v2:business:${businessId}`);
  }
}
