# Coding Standards

## Purpose

This document defines the coding conventions for the MultiTree codebase.

These standards exist to keep the project consistent, maintainable, and easy to extend. General engineering principles are defined in `AGENTS.md`; this document focuses on implementation standards specific to this repository.

---

# General Principles

Always write production-quality code.

Prefer:

* readability over cleverness
* reuse over duplication
* consistency over personal preference
* explicit behavior over implicit behavior

Leave the codebase cleaner than you found it.

---

# TypeScript

* Use strict TypeScript.
* Avoid `any` unless absolutely unavoidable.
* Prefer explicit types for public APIs.
* Use inference where it improves readability.
* Share common types through `packages/types`.
* Remove unused types immediately.

---

# Naming

Use descriptive names.

Examples:

* `BusinessService`
* `UpdateWebsiteDto`
* `getBusinessById`
* `WebsiteCard`

Avoid:

* abbreviations
* temporary names
* numbered names
* generic utility names

Names should clearly describe responsibility.

---

# Project Organization

Organize code by feature.

Keep related files together.

Avoid unnecessary folder nesting.

Delete obsolete files during refactoring.

---

# Reuse

Before creating:

* component
* hook
* service
* DTO
* utility
* validation
* helper

Search the project first.

If similar functionality exists, extend it instead of creating another implementation.

Business logic must never be duplicated.

---

# Frontend

Business logic should not live inside React components.

Components should focus on presentation.

Prefer reusable UI.

Avoid unnecessary Client Components.

Keep pages lightweight.

Do not duplicate layouts or UI patterns.

---

# Backend

Controllers should:

* validate requests
* authenticate users
* authorize access
* call services
* return responses

Services should contain business logic.

Database access should remain inside infrastructure or repository layers.

Avoid business logic in controllers.

---

# Multi-Tenant Rules

Every business-owned database operation must be scoped using the authenticated business or tenant.

Never trust client-provided tenant identifiers.

Tenant isolation is mandatory.

---

# Permissions

Permissions, roles, entitlements, quotas, and approval workflows are separate concepts.

Do not combine them into a single authorization check.

Always enforce permissions on the backend.

Frontend checks improve UX but are not security boundaries.

---

# Storage

Always write uploads through `StorageService`.

Never access storage implementations directly.

Storage drivers should remain interchangeable.

---

# Redis

Redis is used for:

* cache
* sessions
* queues
* rate limiting
* temporary data

Invalidate affected cache entries after data mutations.

Delete only application-owned Redis keys.

Never flush shared Redis instances during normal operation.

---

# Database

PostgreSQL is the source of truth.

Keep application startup schema-neutral.

Run migrations explicitly.

Never modify production schemas manually.

Optimize queries before adding caches.

Avoid N+1 queries.

Use transactions when consistency is required.

---

# Error Handling

Handle expected failures explicitly.

Never silently ignore errors.

Return predictable responses.

Log server-side failures.

Avoid exposing internal implementation details.

---

# Logging

Logs should help diagnose problems.

Never log:

* passwords
* tokens
* secrets
* sensitive personal data

Use structured logging whenever possible.

---

# Imports

Keep imports organized.

Remove unused imports immediately.

Avoid circular dependencies.

Prefer project aliases where configured.

---

# Dependencies

Add new dependencies only when necessary.

Prefer existing project libraries.

Remove unused packages.

Keep dependencies updated.

---

# Comments

Write self-explanatory code.

Use comments only when explaining intent or non-obvious decisions.

Remove outdated comments.

Do not leave commented-out code.

---

# Refactoring

Whenever modifying existing code:

* remove duplication
* remove dead code
* simplify logic
* improve naming
* preserve behavior unless fixing a bug

Avoid unrelated refactoring.

---

# Repository Rules

* Scope every business-owned database operation by authenticated business ID or a server-resolved business subdomain.
* Never trust browser-supplied tenant identifiers such as `x-subdomain`.
* Keep transport contracts inside `packages/types`.
* Respect the frontend dependency boundaries defined in `docs/architecture.md`.
* Keep HTTP translation and authorization in controllers.
* Keep application rules in services.
* Enforce permissions in backend services and guards.
* Write uploads through `StorageService`.
* Invalidate relevant Redis cache entries after public data changes.
* Keep application startup schema-neutral.
* Run migrations explicitly.
* Never commit `.env`, production uploads, secrets, generated files, or logs.

---

# Definition of Done

Before considering a task complete:

* Code follows project architecture.
* Existing implementations were reused where possible.
* No duplicate logic was introduced.
* No dead code remains.
* No unused imports remain.
* TypeScript passes.
* Lint passes.
* Relevant tests pass.
* Documentation is updated if behavior changed.

Every contribution should improve the consistency, maintainability, and reliability of the project.
