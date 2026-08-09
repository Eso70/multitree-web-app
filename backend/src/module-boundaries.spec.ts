import * as fs from 'fs';
import * as path from 'path';

function moduleFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return moduleFiles(absolute);
    return entry.name.endsWith('.module.ts') ? [absolute] : [];
  });
}

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

describe('Nest module boundaries', () => {
  it('keeps only universal database and Redis infrastructure global', () => {
    const globalModules = moduleFiles(__dirname)
      .filter((file) => /@Global\(\)/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(__dirname, file).replaceAll('\\', '/'))
      .sort();

    expect(globalModules).toEqual([
      'database/database.module.ts',
      'redis/redis.module.ts',
    ]);
  });

  it.each([
    ['auth/auth.module.ts', ['BillingModule']],
    [
      'analytics/analytics.module.ts',
      ['AuthModule', 'BillingModule', 'ObservabilityModule'],
    ],
    [
      'api-platform/api-platform.module.ts',
      ['AuthModule', 'BillingModule', 'WebhookModule'],
    ],
    [
      'communications/communication.module.ts',
      ['AuthModule', 'ObservabilityModule'],
    ],
    [
      'linktrees/linktrees.module.ts',
      ['AuthModule', 'BillingModule', 'WebhookModule'],
    ],
    ['api-platform/webhook.module.ts', ['AuthModule', 'ObservabilityModule']],
  ] as const)(
    '%s declares its non-global domain dependencies',
    (modulePath, dependencies) => {
      const moduleSource = source(modulePath);
      for (const dependency of dependencies) {
        expect(moduleSource).toMatch(
          new RegExp(`imports\\s*:\\s*\\[[\\s\\S]*?\\b${dependency}\\b`),
        );
      }
    },
  );
});
