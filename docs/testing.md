# Testing and verification

Everything, in one command:

```bash
pnpm verify
```

That runs lint, type-check, test, and build across both applications. `lint`
and `type-check` never write to the working tree, so the same command is
safe in CI. Use `pnpm lint:fix` when you do want ESLint to apply fixes.

Individual applications:

```bash
pnpm --filter backend lint
pnpm --filter backend type-check
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter backend build
```

```bash
pnpm --filter frontend lint
pnpm --filter frontend type-check
pnpm --filter frontend test
pnpm --filter frontend build
```

No fixed passing-test count is documented because the suite changes with the
code. Use the command output from the current revision as the source of
truth.

## Proportionate verification

Do not run every repository test after every localized change. Verification
must be proportional to the scope and risk of the work:

- Run the directly related unit, component, or integration tests for a
  localized change.
- Run the affected application's type check or lint only when the change can
  influence types, imports, framework rules, or shared code.
- Run an affected production build when changing routing, framework
  boundaries, build configuration, or server/client composition.
- Run a complete application or repository suite only for broad cross-cutting
  changes, shared infrastructure changes, security-sensitive work, database
  changes, release preparation, or when focused verification reveals possible
  wider impact.

Do not repeatedly rerun an unchanged full suite within the same task. Record
the successful result and rerun only the checks affected by subsequent edits.
This keeps feedback fast and avoids consuming unnecessary development time and
compute while preserving risk-based confidence.

## Commands reference

| Command                                          | Action                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `pnpm lint`                                      | Run ESLint over both applications without writing changes    |
| `pnpm lint:fix`                                  | Run ESLint over both applications and apply fixes            |
| `pnpm type-check`                                | Run TypeScript over both applications without emitting files |
| `pnpm test`                                      | Run the frontend Vitest suite, then the backend Jest suite   |
| `pnpm test:e2e`                                  | Run the backend e2e configuration                            |
| `pnpm verify`                                    | Run lint, type-check, test, and build in order               |
| `pnpm --filter frontend test`                    | Run the Vitest suite once                                    |
| `pnpm --filter backend test`                     | Run Jest unit/property/integration specs under `backend/src` |
| `pnpm --filter backend test:e2e`                 | Run the Jest e2e configuration                               |
| `pnpm --filter backend test:cov`                 | Run backend tests with coverage                              |
| `pnpm --filter backend test:communication:smoke` | Run the communication database smoke script                  |

Application-specific lint/build/dev commands are in
[docs/frontend.md](frontend.md#commands) and
[docs/backend.md](backend.md#commands). Database commands are in
[docs/database.md](database.md).

Schema-command verification must cover fresh, complete-current, supported
unledgered, partial/unknown, failed, rerun, and concurrent `db:migrate` paths,
plus a `db:reset` path that proves an unrelated sentinel table is removed and
the consolidated schema is recreated. Use only disposable PostgreSQL and Redis
services. Never run `db:reset` against valuable data.

Request-boundary tests cover malformed UUIDs, pagination bounds, invalid enum
actions, unknown/invalid bulk-link payloads, both supported batch-link shapes,
invalid nested URLs and deletion IDs, and valid payload preservation.

Response-boundary tests exercise the real Nest/Fastify serialization path.
They cover canonical and legacy-compatible internal successes, validation
details, generic unexpected failures, and unchanged success plus versioned
error metadata for `/api/v1`.

Frontend request-boundary tests cover shared credentials/cache defaults, JSON
serialization, M2 envelope unwrapping, normalized error metadata, and abort
preservation. Feature-hook tests continue to cover domain normalization and
local state transitions independently from transport parsing.

Shared-dialog tests cover focus entry, forward and reverse focus containment,
and restoration to the element that opened the dialog.

Administration-query tests verify pagination transformation and maximum
limits, secret-free business list projections, fixed-count API dashboard
queries without per-business entitlement lookups, and bounded billing joins.

H6 characterization coverage protects extracted hotspot seams: the
mini-website projection must retain every hydration alias, informational
liquid-glass sections preserve filtering and safe-link behavior, and the
business analytics hook preserves summary normalization, initial loading, and
reset behavior.

Repository tests protect the initial persistence seams for mini-websites,
analytics reads, business administration, and billing. They assert tenant and
publication constraints, bounded pagination inputs, and the identifiers used
to target cache invalidation. Service characterization tests continue to
protect response mapping and transaction orchestration.

Authorization tests verify that Linktree and mini-website creation share the
public-page quota, that the quota query counts both tenant-owned resource
tables, and that mini-website creation declares its dedicated capability.

Module-boundary tests keep the global-module allowlist limited to PostgreSQL
and Redis and assert the explicit auth, billing, webhook, and observability
imports of their consuming domains.

Public-read tests protect the subdomain-scoped Linktree lookup and assert that
the removed unscoped legacy method is not exposed again.

Security-gap regression tests verify that access-rule evaluation defaults to
allow, records a winning rule, rejects a winning deny, accepts a more-specific
allow, and never sends malformed addresses to PostgreSQL `inet` casts. CSP
tests require a per-request nonce plus `'strict-dynamic'`, reject
`'unsafe-inline'` from `script-src`, and keep `'unsafe-eval'` development-only.
Retention tests assert that the policy and eligible counts no longer contain
an audit-log bucket.

## Critical architecture E2E matrix

CI runs the backend E2E suite against disposable PostgreSQL and Redis
services after applying the real migration command. The compact matrix covers:

- public process liveness and complete `AppModule` startup;
- business login for two tenants and the separate platform-administrator
  authentication domain;
- cookie-origin rejection, per-request subdomain binding, and cross-tenant
  resource denial;
- tenant-owned linktree and mini-website creation;
- platform API-client management, developer API scope denial, and idempotent
  write replay;
- durable webhook delivery claiming with `SKIP LOCKED` semantics;
- a supported pre-baseline schema fixture being verified and baselined without
  replaying schema SQL;
- a reset fixture proving the whole database is dropped and recreated solely
  from `full_schema.sql`.

The application fixture refuses to run unless `DB_NAME` contains an explicit
`e2e` or `test` segment. The migration fixture uses a generated
`multitree_migration_e2e_*` database and removes it after the suite. E2E tests
run in band so database setup, worker assertions, and cleanup remain
deterministic.

### Running the e2e suite

`pnpm test:e2e` on its own fails by design: the development `DB_NAME`
(`multitree`) has no `e2e`/`test` segment, and the fixtures are destructive.
It needs a disposable database, created once and provisioned with the same
consolidated schema:

```bash
# once: create the database, then apply full_schema.sql to it
DB_NAME=linktree_e2e pnpm db:migrate

# every run: the suite reads DB_* from the environment, not from .env
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=linktree_e2e pnpm test:e2e
```

The `DB_*` variables must be exported rather than left to `.env`: the e2e
fixtures open their own pools before Nest's config module loads, so an unset
`DB_PASSWORD` surfaces as `SASL: client password must be a string` rather than
as a missing-configuration error.
