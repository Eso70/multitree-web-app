# AGENTS.md

# MultiTree AI Development Guide

## Purpose

This document defines the mandatory development workflow and project-wide rules for all contributors and AI coding assistants.

Detailed implementation standards are documented in the `docs/` directory. This file defines **how work should be approached**, not every implementation detail.

---

# Project Mission

MultiTree is a production-grade multi-tenant Linktree and mini-website platform.

Every change should improve the project's:

* Security
* Correctness
* Maintainability
* Reusability
* Performance
* Consistency
* Scalability

Avoid unnecessary complexity.

---

# Technology Stack

## Frontend

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS

## Backend

* NestJS (Fastify)
* PostgreSQL
* Redis

Follow official framework best practices unless project documentation explicitly defines a different convention.

---

# Project Documentation

Before making changes, review the documentation relevant to the task.

* `README.md`
* `docs/architecture.md`
* `docs/coding-standards.md`
* `docs/frontend.md`
* `docs/backend.md`
* `docs/database.md`
* `docs/api-standards.md`
* `docs/security.md`
* `docs/testing.md`
* `docs/deployment.md`
* `docs/ui-guidelines.md`
* `docs/advertising.md`
* `docs/tracking.md`

Documentation is part of the codebase.

If implementation changes, update the relevant documentation.

---

# Development Workflow

For every task:

1. Understand the existing implementation.
2. Identify reusable code.
3. Follow the existing architecture.
4. Implement the smallest clean solution.
5. Verify correctness.
6. Refactor where appropriate.
7. Update documentation if necessary.

Never skip understanding the existing code before making changes.

---

# Core Principles

Always prioritize, in order:

1. Security
2. Correctness
3. Maintainability
4. Reusability
5. Consistency
6. Performance
7. Simplicity

Prefer simple, readable solutions over clever implementations.

---

# Reuse Before Creating

Before creating any new:

* component
* page
* layout
* hook
* utility
* service
* DTO
* validation
* API endpoint
* database query
* UI pattern

Search the project for an existing implementation.

If one exists, extend or reuse it.

Never duplicate business logic or UI patterns.

If the same logic appears multiple times, extract it into a shared abstraction.

## Shared Components Only

Never define reusable UI inline or as local components inside a page file.

Every modal, dialog, form section, card, button group, and other reusable block
must be its own component file:

* Cross-feature generic UI goes in `components/shared/`.
* Feature-specific components go in `features/<feature>/components/`.

For new features that share functionality with an existing feature, create a
shared component instead of duplicating markup or state logic.

When a local component already exists in a page file, extract it into a
component file at the first opportunity.

---

# Architecture

Follow the existing architecture.

Do not introduce parallel implementations.

Do not bypass established layers.

Responsibilities should remain clear:

* Frontend handles presentation.
* Backend contains business logic.
* PostgreSQL stores permanent data.
* Redis stores temporary data.

Do not move responsibilities between layers without updating the architecture documentation.

---

# UI Consistency

The application must feel like one product.

Business Dashboard, Platform Dashboard, Business Management, Settings, Authentication, and Public Pages should share the same design language.

Always reuse existing:

* layouts
* components
* cards
* tables
* forms
* dialogs
* navigation
* typography
* spacing
* colors
* loading states
* empty states

Only introduce new UI patterns when no existing pattern satisfies the requirement.

Consistency is more important than visual variety.

---

# Code Quality

Write production-quality code.

Always:

* use strict TypeScript
* keep functions focused
* remove dead code
* remove unused imports
* avoid `any` unless unavoidable
* avoid commented-out code
* avoid temporary implementations
* prefer composition over duplication

Leave the codebase cleaner than you found it.

---

# Multi-Tenant Rules

Tenant isolation is mandatory.

Every protected request must verify:

* authentication
* authorization
* tenant ownership
* business ownership
* required permissions

Never trust identifiers received from the client.

Never expose data across tenant boundaries.

---

# Analytics and Advertising Tracking

The TikTok pixel and the Events API apply to two surfaces only: the public
linktree page and the public mini website page, per business. They must not be
added to the platform's own site, the admin console, the business dashboard,
the business subdomain landing page, or the advertising page.

Any new feature on either public page reports through the shared page tracker
and registers a `public_page_actions` row. Never call the pixel directly.

`docs/tracking.md` is the procedure and is mandatory reading before touching
either page.

---

# Database

PostgreSQL is the source of truth.

Redis should only be used for:

* caching
* sessions
* queues
* rate limiting
* temporary data

The repository uses one consolidated schema baseline. Schema changes must be
folded into `backend/src/database/migrations/full_schema.sql`; do not create
dated forward migration files. `db:migrate` does not upgrade old databases.
Reset only disposable databases, and use an explicitly reviewed backup and
replacement procedure for valuable environments.

Never modify production schemas manually.

---

# Security

Security is mandatory.

Always:

* validate input
* authorize actions
* authenticate users
* protect secrets
* hash passwords
* validate uploads
* sanitize untrusted content
* prevent common web vulnerabilities

Never expose internal implementation details to clients.

Refer to `docs/security.md` for complete security requirements.

---

# Performance

Optimize for maintainability first, then performance.

Avoid:

* unnecessary rendering
* duplicated requests
* inefficient database queries
* unnecessary network calls

Use:

* pagination
* caching
* indexing
* lazy loading
* background jobs

where appropriate.

---

# Refactoring

Whenever touching existing code:

* remove duplication
* simplify logic
* improve readability
* preserve behavior unless intentionally fixing a bug

Do not refactor unrelated areas without clear benefit.

---

# Error Handling

Handle errors consistently.

Never silently ignore failures.

Log server-side errors.

Return predictable and user-friendly responses.

---

# Definition of Done

A task is complete only when:

* The implementation satisfies the requirements.
* Existing architecture is respected.
* Existing UI patterns are reused.
* No duplicate code has been introduced.
* No dead code remains.
* TypeScript passes.
* Lint passes.
* The project builds successfully.
* Relevant tests pass or are updated.
* Documentation has been updated if required.
* Security and tenant isolation remain intact.

---

# General Mindset

Build software that is easy to understand, easy to maintain, and easy to extend.

Prefer improving existing systems over creating new ones.

Every change should move the project toward greater consistency, reliability, and long-term maintainability.
