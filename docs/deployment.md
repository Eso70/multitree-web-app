# Deployment

Register exact production callback
`https://<root-domain>/api/auth/google/callback` in Google Cloud and configure
`APP_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`GOOGLE_OAUTH_REDIRECT_URI`. Redis 6.2+ is required for atomic `GETDEL`
consumption of OAuth state and handoff codes. Verify wildcard TLS and DNS for
tenant subdomains before enabling owner sign-in.

This document describes the supported deployment workflow for MultiTree.

The current deployment model targets a single production host running clustered frontend and backend processes behind Caddy.

---

# Local Development

## Requirements

The development environment requires:

- Node.js 22 or newer; Node.js 24 is the pinned deployment and CI version
- pnpm 9 or newer
- PostgreSQL with `pgcrypto` and `pg_trgm`
- Redis

Install dependencies:

```bash
pnpm install
```

Create the root `.env` file (see `docs/backend.md`), start PostgreSQL and Redis, then apply the database schema:

```bash
pnpm db:migrate
```

The command acquires a database advisory lock. It fails closed for unknown or
outdated schemas; do not bypass the error or mark `schema_migrations`
manually. It creates a new database from `full_schema.sql` or verifies an
existing database already matches it; it does not perform incremental schema
upgrades.

Run the backend and frontend in separate terminals:

```bash
pnpm dev:be
pnpm dev:fe
```

Default local addresses:

| Service | Address |
|---------|---------|
| Frontend | http://localhost:3011 |
| Backend | http://localhost:4000 |

See:

- `docs/frontend.md`
- `docs/backend.md`
- `docs/testing.md`

for complete command references.

---

# Production Build

Build the entire workspace:

```bash
pnpm build
```

Verify the build completes successfully before deployment.

---

# Production Runtime

The repository includes a PM2 configuration:

```
ecosystem.config.json
```

It starts:

- two clustered backend processes
- two clustered frontend processes

Backend:

```
backend/dist/src/main.js
```

Frontend:

```
next start
```

Default ports:

| Service | Port |
|---------|-----:|
| Backend | 4000 |
| Frontend | 3011 |

Start the application:

```bash
pm2 start ecosystem.config.json
```

Reload after deployment:

```bash
pm2 reload ecosystem.config.json
```

The root `package.json` wraps the same commands so the configuration file
name lives in one place:

| Command | Action |
|---------|--------|
| `pnpm pm2:start` | Start both applications |
| `pnpm pm2:start:max` | Start both applications on all available cores |
| `pnpm pm2:reload` | Zero-downtime reload after a deployment |
| `pnpm pm2:restart` | Restart both applications |
| `pnpm pm2:stop` | Stop both applications |
| `pnpm pm2:delete` | Remove both applications from PM2 |
| `pnpm pm2:logs` | Tail PM2 logs |
| `pnpm pm2:monit` | Open the PM2 monitor |

These target `ecosystem.config.json` rather than a typed process name, so
they always act on exactly the applications that file defines.

---

# Reverse Proxy

The repository includes a Caddy configuration.

Current configuration:

- serves the root domain
- serves wildcard business subdomains
- forwards `/api/*` to the backend
- forwards all other requests to the frontend
- removes client-supplied `x-subdomain`
- preserves forwarding headers
- provisions wildcard TLS using the Cloudflare DNS challenge

The bundled configuration is currently specific to the production domain and should be updated if deploying under a different domain.

---

# Deployment Procedure

First compare the deployed `full_schema.sql` with the new release. If it
changed, prepare and review a backup, data-transfer, and database-replacement
procedure before deploying. Never run `db:reset` against production or any
valuable environment. The steps below apply when the schema is unchanged or
after the replacement database has already been prepared and verified.

Before deploying:

1. Use Node.js 24 (the version pinned in `.nvmrc`); Node.js 22 is the minimum
   supported runtime because current workspace dependencies require it.
2. Back up PostgreSQL.
3. Back up `UPLOAD_DIR` (default: `<repository>/.runtime/uploads`) and, during
   the compatibility period, the former `frontend/public/images/upload`
   directory if it still contains files.
4. Deploy the new application version.
5. Install dependencies.
6. Run:

```bash
pnpm db:migrate
```

7. Build:

```bash
pnpm build
```

7. Reload PM2:

```bash
pm2 reload ecosystem.config.json
```

8. Verify:

- root domain
- business subdomains
- authentication
- public pages
- uploads
- API
- analytics
- business dashboard
- platform administration

---

# Environment

Production deployments should use:

- unique secrets
- HTTPS
- production database
- production Redis
- production upload directory

Never deploy using development credentials.

Never commit `.env`.

---

# Backups

Before every production deployment:

- back up PostgreSQL
- back up uploaded media

Backups should be verified periodically by restoring them in a non-production environment.

---

# Monitoring

Production deployments should monitor:

- application health
- process status
- disk usage
- PostgreSQL
- Redis
- upload storage

Unexpected failures should be logged and investigated promptly.

Use `GET /health/live` for process restarts. Use `GET /health/ready` for
traffic admission and dependency alerts, supplying `x-operations-key` with
the configured `OPERATIONS_SECRET`. The readiness probe returns `503` when
PostgreSQL, Redis, upload storage, or a registered worker is unhealthy.
Collect `GET /internal/metrics` with the same header. Never place either
protected endpoint or its secret in a public browser monitor.

---

# Rollback

The current repository does not include an automated rollback process.

If deployment fails:

1. Restore the previous application version.
2. Restore the database backup if required.
3. Restore uploaded media if necessary.
4. Restart the application.
5. Verify MultiTree functionality.

---

# Current Scaling Boundary

The current architecture supports:

- multiple frontend processes
- multiple backend processes
- shared PostgreSQL
- shared Redis

The following are not yet implemented:

- shared object storage
- distributed upload storage
- connection pooling infrastructure
- centralized log aggregation (requests are already emitted as structured logs)
- durable metric collection (a protected in-process snapshot is available)
- tracing
- alerting
- automated backups
- automated failover

Local uploads currently make the deployment effectively single-host.

See `docs/architecture.md` for the planned production scaling model.

---

# Deployment Checklist

Before considering a deployment successful verify:

- Consolidated database schema verification completed successfully.
- Backend started successfully.
- Frontend started successfully.
- Root domain works.
- Business subdomains work.
- Platform administration is accessible.
- Authentication works.
- Uploads work.
- API endpoints respond correctly.
- Analytics continue collecting data.
- Background jobs are processing normally.
- No unexpected errors appear in application logs.
