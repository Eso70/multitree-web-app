import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PUBLIC_PLANS_CACHE_KEY,
  PUBLIC_PLANS_CACHE_TTL_SECONDS,
} from './public-catalog-cache';

const backendSrc = join(__dirname, '..');

function source(relative: string): string {
  return readFileSync(join(backendSrc, relative), 'utf8');
}

describe('public plan catalog cache', () => {
  it('names one key that the read and every writer share', () => {
    expect(PUBLIC_PLANS_CACHE_KEY).toBe('cache:public:plans');
    expect(PUBLIC_PLANS_CACHE_TTL_SECONDS).toBeGreaterThan(0);

    const read = source('public/public.service.ts');
    expect(read).toContain('PUBLIC_PLANS_CACHE_KEY');
    // The literal lived in two halves that did not agree; the read must not
    // reintroduce its own copy.
    expect(read).not.toContain("'cache:public:plans'");
  });

  /**
   * The public plan table is served from one Redis entry for five minutes and
   * is not re-derived per request. Nothing cleared it, so a price change, a
   * rename, a deactivation or an outright deletion stayed on the marketing page
   * until the entry expired.
   */
  it('clears the cache from every mutation that changes the public plan table', () => {
    const billing = source('platform-admin/billing-management.service.ts');

    const mutations = [
      'async createPlan(',
      'async updatePlan(',
      'async createSubscriptionPlan(',
      'async updateSubscriptionPlan(',
      'async deleteSubscriptionPlan(',
      'async updatePlanConfiguration(',
    ];

    for (const mutation of mutations) {
      const start = billing.indexOf(mutation);
      expect(start).toBeGreaterThan(-1);
      const next = mutations
        .map((other) => billing.indexOf(other, start + mutation.length))
        .filter((index) => index > -1);
      const body = billing.slice(
        start,
        next.length ? Math.min(...next) : billing.length,
      );
      expect(body).toContain('invalidatePublicPlans()');
    }
  });

  it('keeps the purge from failing the mutation it follows', () => {
    const billing = source('platform-admin/billing-management.service.ts');
    const helper = billing.slice(
      billing.indexOf('private async invalidatePublicPlans()'),
    );

    // The plan change is committed by this point; a Redis outage must not turn
    // a saved edit into an error.
    expect(helper.slice(0, 400)).toContain('catch');
  });
});
