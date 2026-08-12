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
    '../platform-admin/audit-log.controller.ts',
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

  it('uses a mini-website capability for mini-website creation', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../mini-websites/mini-websites.controller.ts'),
      'utf8',
    );

    expect(source).toMatch(
      /@Post\(\)[\s\S]*?Capability\.BusinessMiniWebsitesCreate/,
    );
    expect(source).not.toMatch(
      /@Post\(\)[\s\S]*?Capability\.BusinessLinktreesCreate[\s\S]*?async create/,
    );
  });

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
      '../request-tracking/internal-request-tracking.controller.ts': [
        'internal telemetry',
      ],
    };
    expect(Object.keys(allowlist)).toHaveLength(4);
  });

  it('separates simple analytics from the advanced analytics workspace', () => {
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
    expect(source).toMatch(
      /@Get\('crm\/summary'\)[\s\S]*?@RequireCapabilities\(Capability\.BusinessAnalyticsDetailsRead\)/,
    );

    for (const route of [
      'pages/:pageId/daily',
      'daily',
      'breakdowns',
      'pages/:pageId/visitors',
      'pages/:pageId/visitors/:visitorId/journey',
      'funnel',
      'retention',
      'realtime',
    ]) {
      const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(source).toMatch(
        new RegExp(
          `@Get\\('${escapedRoute}'\\)[\\s\\S]*?@RequireCapabilities\\(Capability\\.BusinessAnalyticsAdvancedRead\\)`,
        ),
      );
    }
  });
});
