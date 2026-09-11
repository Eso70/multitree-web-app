import * as fs from 'fs';
import * as path from 'path';
import { PERMISSION_CATALOG } from './capabilities';

describe('application permission registry', () => {
  it('contains unique, well-formed application-owned keys', () => {
    const keys = PERMISSION_CATALOG.map((permission) => permission.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const permission of PERMISSION_CATALOG) {
      expect(permission.key).toMatch(
        /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/,
      );
      expect(permission.resource).not.toHaveLength(0);
      expect(permission.action).not.toHaveLength(0);
      // Only some catalog entries declare field-level rules, so the union has
      // to be narrowed with `in` before the property can be read.
      if ('fields' in permission && permission.fields) {
        const fields = permission.fields as Readonly<Record<string, string>>;
        expect(Object.keys(fields).length).toBeGreaterThan(0);
      }
    }
  });

  it.each([
    '../links/links.controller.ts',
    '../linktrees/linktrees.controller.ts',
    '../platform-admin/access-rules.controller.ts',
    '../platform-admin/access-control.controller.ts',
    '../platform-admin/billing-management.controller.ts',
    '../platform-admin/business-administration.controller.ts',
    '../platform-admin/platform-settings.controller.ts',
  ])(
    '%s declares a registered permission for every protected route',
    (file) => {
      const source = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
      const routeCount = [...source.matchAll(/@(Get|Post|Put|Patch|Delete)\b/g)]
        .length;
      const declarationCount = [
        ...source.matchAll(/@RequireCapabilities\s*\(/g),
      ].length;
      expect(declarationCount).toBe(routeCount);
    },
  );

  it('keeps mixed public/auth controllers on an explicit authorization allowlist', () => {
    const allowlist = {
      'auth.controller.ts': [
        'login',
        'logout',
        'settings',
        'effective-access',
        'subdomain-theme/:subdomain',
        'subdomain-check',
        // Ends an already-authorized impersonated session; the platform
        // capability is enforced where the session is minted.
        'impersonation/exit',
      ],
      'platform-auth.controller.ts': [
        'login',
        'profile',
        'effective-access',
        'logout',
      ],
      '../public/public.controller.ts': ['public'],
    };
    expect(Object.keys(allowlist)).toHaveLength(3);
  });

  it('keeps only the per-page analytics and TikTok diagnostic routes', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../analytics/unified-analytics.controller.ts'),
      'utf8',
    );

    expect(source).toMatch(
      /@Get\('summary'\)[\s\S]*?@RequireCapabilities\(Capability\.BusinessAnalyticsTotalsRead\)/,
    );
    expect(source).toMatch(
      /@Get\('pages\/:pageId\/actions'\)[\s\S]*?@RequireCapabilities\(Capability\.BusinessAnalyticsDetailsRead\)/,
    );
    expect(source).not.toContain('BusinessAnalyticsAdvancedRead');
    expect(source).not.toContain("@Get('breakdowns')");
    expect(source).not.toContain("@Get('visitors')");
    expect(source).not.toContain("@Get('funnel')");
    expect(source).not.toContain("@Get('retention')");
    expect(source).not.toContain("@Get('realtime')");
  });
});
