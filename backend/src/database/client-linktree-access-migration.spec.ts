import { readFileSync } from 'fs';
import { join } from 'path';

const SQL = readFileSync(
  join(__dirname, 'migrations', 'baseline', '95_late_schema.sql'),
  'utf8',
);

describe('client Linktree access baseline folding', () => {
  it('stores invitation and session digests instead of raw secrets', () => {
    expect(SQL).toContain('token_hash character(64)');
    expect(SQL).toContain('pin_hash character(64)');
    expect(SQL).toContain('session_token_hash character(64)');
    expect(SQL).not.toMatch(/\btoken\s+(?:text|character varying)/i);
    expect(SQL).not.toMatch(/\bpin\s+(?:text|character varying)/i);
  });

  it('enforces one resulting Linktree per invitation', () => {
    expect(SQL).toContain(
      'ADD CONSTRAINT linktrees_client_invitation_id_key UNIQUE (client_invitation_id)',
    );
  });

  it('preserves a created Linktree when invitation access is removed', () => {
    expect(SQL).toMatch(
      /FOREIGN KEY \(client_invitation_id\)[\s\S]*?ON DELETE SET NULL/,
    );
  });
});
