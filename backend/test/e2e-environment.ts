import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Environment the end-to-end suite needs, resolved before any module loads.
 *
 * These specs used to depend on the operator having exported the right
 * variables by hand, so `pnpm test:e2e` on its own failed and whether it
 * passed otherwise depended on the machine.
 *
 * The `.env` files come first, in the same order the migration scripts read
 * them, because `migration-upgrade.e2e-spec.ts` connects with raw `pg` pools
 * and never had anything to load them. Without that it fails on the first
 * connection with "client password must be a string".
 *
 * `ROOT_DOMAIN` is then pinned. Every request the suite injects is addressed to
 * a `<subdomain>.localhost` host, and `BusinessGuard` derives the tenant by
 * stripping the root domain off that host. With a developer value such as
 * `lvh.me:3011` no subdomain can be derived, so a perfectly valid session is
 * rejected as "Invalid business session" and the tenant-isolation assertions
 * fail for a reason that has nothing to do with the code under test. The
 * `x-subdomain` header is not a way around it: `internal-proxy-trust.ts`
 * deliberately ignores that header without a valid internal proxy key.
 *
 * `DB_NAME` is defaulted, never forced over a disposable one. Both suites
 * truncate tables and drop databases, and both refuse to run against a name
 * that does not look disposable; this only supplies a safe default when
 * nothing suitable was configured.
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const E2E_DATABASE = 'multitree_e2e';
const DISPOSABLE_DATABASE = /(?:^|[_-])(e2e|test)(?:[_-]|$)/i;

process.env.ROOT_DOMAIN = 'localhost';

if (!DISPOSABLE_DATABASE.test(process.env.DB_NAME || '')) {
  process.env.DB_NAME = E2E_DATABASE;
}
