import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ENTITLEMENT,
  entitledSql,
  allowedTemplateKeySql,
} from './entitlement-sql';

describe('entitledSql', () => {
  it('correlates on the caller-supplied businesses alias', () => {
    expect(entitledSql(ENTITLEMENT.tiktok)).toContain(
      'subscription.business_id = business.id',
    );
    expect(entitledSql(ENTITLEMENT.tiktok, 'owner')).toContain(
      'subscription.business_id = owner.id',
    );
  });

  it('counts only a subscription that is currently paying', () => {
    const sql = entitledSql(ENTITLEMENT.miniWebsites);
    expect(sql).toContain(
      "subscription.status IN ('trialing','active','grace_period')",
    );
    expect(sql).toContain("plan_value.value = 'true'::jsonb");
  });

  /**
   * A retired catalog entry carries no grant. Effective access, the public
   * business payload and the plan editor all filter on it; this fragment did
   * not, so an entitlement a platform administrator deactivated kept the paid
   * public surface serving and the Events API forwarding while every dashboard
   * reported the feature as gone.
   */
  it('ignores an entitlement that has been retired from the catalog', () => {
    expect(entitledSql(ENTITLEMENT.tiktok)).toContain(
      "entitlement.status = 'active'",
    );
  });

  it('agrees with every other reader of the entitlement catalog', () => {
    const readers = [
      'billing/entitlement.service.ts',
      'auth/authorization.service.ts',
      'public/public.service.ts',
      // The monthly profile-change allowance reads the same catalog, and its
      // limit is only meaningful while the entry granting it is live.
      'auth/approval.service.ts',
    ];

    for (const relative of readers) {
      const source = readFileSync(join(__dirname, '..', relative), 'utf8');
      expect(source).toMatch(/status\s*=\s*'active'/);
    }
  });

  it('refuses an entitlement key or alias it cannot safely interpolate', () => {
    expect(() => entitledSql("x'; DROP TABLE businesses; --")).toThrow(
      /Unsafe entitlement key/,
    );
    expect(() => entitledSql(ENTITLEMENT.tiktok, 'business; DROP')).toThrow(
      /Unsafe SQL alias/,
    );
  });
});

describe('allowedTemplateKeySql', () => {
  /**
   * Both arguments are compile-time constants at the one call site today, and
   * this is what keeps that true: the sibling fragment checked its inputs while
   * this one interpolated whatever it was handed.
   */
  it('refuses a column or alias it cannot safely interpolate', () => {
    expect(() =>
      allowedTemplateKeySql("lt.template_key = '' OR 1=1 --"),
    ).toThrow(/Unsafe SQL column/);
    expect(() =>
      allowedTemplateKeySql('lt.template_key; DROP TABLE x'),
    ).toThrow(/Unsafe SQL column/);
    expect(() =>
      allowedTemplateKeySql('lt.template_key', 'a; DROP TABLE x'),
    ).toThrow(/Unsafe SQL alias/);
  });

  it('accepts a bare or singly-qualified column', () => {
    expect(() => allowedTemplateKeySql('template_key')).not.toThrow();
    expect(() => allowedTemplateKeySql('lt.template_key', 'a')).not.toThrow();
  });

  it('keeps a template the plan still carries and falls back otherwise', () => {
    const sql = allowedTemplateKeySql('linktree.template_key');
    expect(sql).toContain('plan_template.template_key = linktree.template_key');
    expect(sql).toContain("ELSE 'spectrum'");
    expect(sql).toContain(
      "subscription.status IN ('trialing','active','grace_period')",
    );
  });
});
