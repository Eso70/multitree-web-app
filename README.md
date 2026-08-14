# MultiTree

MultiTree is a production-ready, multi-tenant platform for creating branded Linktree pages and mini-websites on custom business subdomains.

It includes:

- Multi-tenant architecture
- Business dashboard
- Platform administration console
- Public Linktree and mini-website builder
- Analytics and CRM
- Role, permission, and access management
- Subscription, entitlement, and quota management
- Developer API and webhooks
- Background jobs and notifications
- Secure authentication and authorization
- Invite-only Google business onboarding with administrator review
- Tenant-bound Google or email-code business login

The repository is a pnpm workspace containing:

- Next.js 16 / React 19 frontend
- NestJS 11 (Fastify) backend
- PostgreSQL
- Redis
- Shared TypeScript packages
- PM2 production runtime
- Caddy reverse proxy

The billing system manages subscriptions, plans, permissions, entitlements, and quotas. It does **not** process payments or integrate with payment providers.

---

# Quick Start

## Requirements

- Node.js 22+ (Node.js 24 recommended and pinned in `.nvmrc`)
- pnpm 9+
- PostgreSQL
- Redis

Install dependencies:

```bash
pnpm install
```

Create your environment file:

```bash
cp .env.example .env
```

Update all placeholder values.

Apply the database schema:

```bash
pnpm db:migrate
```

Start the backend:

```bash
pnpm dev:be
```

Start the frontend:

```bash
pnpm dev:fe
```

Default local URLs:

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3011 |
| Backend  | http://localhost:4000 |

---

# Repository Structure

```text
.
├── frontend/              # Next.js application
├── backend/               # NestJS application
├── packages/
│   └── types/             # Shared TypeScript contracts
├── docs/                  # Project documentation
├── AGENTS.md              # AI and contributor development rules
└── README.md
```

---

# Documentation

The detailed project documentation lives in the `docs/` directory.

| Document                                  | Description                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `AGENTS.md`                               | AI development rules, engineering principles, project-wide conventions                     |
| `docs/architecture.md`                    | MultiTree architecture, module boundaries, storage, scaling, repository structure          |
| `docs/security.md`                        | Authentication, authorization, encryption, rate limiting, uploads, webhooks, audit logging |
| `docs/frontend.md`                        | Frontend architecture, routing, implemented features, dashboard, public pages              |
| `docs/backend.md`                         | Backend architecture, analytics, CRM, uploads, environment configuration                   |
| `docs/database.md`                        | PostgreSQL schema, Redis usage, migrations, reset workflow, demo data                      |
| `docs/api-standards.md`                   | REST conventions, API design, scopes, webhooks, versioning                                 |
| `docs/testing.md`                         | Testing workflow, verification commands, testing strategy                                  |
| `docs/deployment.md`                      | Local development, production deployment, PM2, Caddy, scaling                              |
| `docs/observability.md`                   | Health checks, operational metrics, logging, and alerting guidance                         |
| `docs/coding-standards.md`                | Repository-specific coding conventions                                                     |
| `docs/ui-guidelines.md`                   | Design system, reusable components, UI consistency rules                                   |
| `docs/tracking.md`                        | TikTok pixel and Events API scope, the shared page tracker, event deduplication            |
| `docs/future-dual-domain-architecture.md` | Planned separation of the platform domain from the business tenant domain                  |

---

# Development Workflow

Before implementing new functionality:

1. Read `AGENTS.md`.
2. Review the relevant documentation in `docs/`.
3. Reuse existing components, services, and utilities.
4. Follow the established architecture and UI patterns.
5. Update documentation if behavior or architecture changes.
6. Verify the project builds successfully before finishing.

---

# Common Commands

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `pnpm install`    | Install dependencies                               |
| `pnpm dev:be`     | Start backend                                      |
| `pnpm dev:fe`     | Start frontend                                     |
| `pnpm build`      | Build entire workspace                             |
| `pnpm db:migrate` | Apply or verify the consolidated database schema   |
| `pnpm db:reset`   | Drop and fully recreate the database (destructive) |
| `pnpm verify`     | Run the full verification workflow                 |

See `docs/backend.md`, `docs/frontend.md`, `docs/testing.md`, and `docs/deployment.md` for complete command references and operational guidance.
