import { join } from 'path';
import { readBaselineSql } from './baseline';

describe('platform content baseline', () => {
  const sql = readBaselineSql(join(__dirname, 'migrations'));

  it('creates exactly one explicitly typed platform owner', () => {
    expect(sql).toContain('account_type character varying(20)');
    expect(sql).toContain('uq_businesses_one_platform_workspace');
    expect(sql).toContain("WHERE account_type = 'platform'");
    expect(sql).toContain('00000000-0000-4000-8000-000000000001');
    expect(sql).toContain("IF NEW.account_type <> 'business'");
  });

  it('registers every guarded platform page operation', () => {
    for (const domain of ['linktrees', 'mini-websites']) {
      for (const action of ['read', 'create', 'update', 'delete', 'upload']) {
        expect(sql).toContain(`'platform:${domain}:${action}'`);
      }
    }
  });

  it('adds platform TikTok permissions and fixed route identities', () => {
    expect(sql).toContain('platform:settings:tiktok-read');
    expect(sql).toContain('platform:settings:tiktok-update');
    expect(sql).toContain(
      "page_type IN ('linktree','mini_website','advertising','route')",
    );
    expect(sql).toContain("'advertising-video-code'");
    expect(sql).toContain("'join-application'");
    expect(sql).not.toMatch(/CREATE\s+TABLE\s+.*platform.*tiktok/i);
  });
});
