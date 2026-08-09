# Feature Development

This document defines the standard workflow for implementing new features in MultiTree.

For repository-wide engineering principles, see `AGENTS.md`.

For implementation details, refer to the relevant documentation under `docs/`.

---

# Development Principles

Every feature should:

- follow the existing architecture
- reuse existing components and services
- preserve tenant isolation
- maintain UI consistency
- be secure by default
- avoid unnecessary complexity
- leave the codebase cleaner than before

Never implement a feature by bypassing existing architecture.

---

# Development Workflow

## 1. Understand the Requirement

Before writing code:

- understand the complete requirement
- identify affected modules
- identify affected users
- identify security implications
- identify permission requirements
- identify database changes
- identify API changes
- identify UI changes

Never begin implementation without understanding the full scope.

---

## 2. Review Existing Code

Search the project before creating anything new.

Look for existing:

- components
- pages
- layouts
- dialogs
- tables
- forms
- services
- hooks
- utilities
- DTOs
- validation
- repositories
- API endpoints
- database structures

Prefer extending existing implementations.

Avoid duplicate functionality.

---

## 3. Design Before Coding

Decide:

- where the feature belongs
- which modules are affected
- what can be reused
- what should remain independent

Keep responsibilities separated.

Avoid mixing unrelated concerns.

---

## 4. Database Changes

If the feature requires schema changes:

- update the consolidated `full_schema.sql`
- do not create dated forward migration files
- reset only disposable databases
- plan an explicitly reviewed data transfer and replacement for valuable data
- add indexes when appropriate
- preserve tenant isolation

See `docs/database.md`.

---

## 5. Backend Implementation

Implement in this order:

1. DTOs
2. validation
3. services
4. controllers
5. permissions
6. caching
7. logging
8. tests

Controllers should remain thin.

Business logic belongs in services.

Never duplicate business logic.

---

## 6. API

If the feature exposes APIs:

- follow REST conventions
- validate every request
- authorize every protected action
- return consistent responses
- use appropriate HTTP status codes
- preserve backward compatibility

See `docs/api-standards.md`.

---

## 7. Frontend Implementation

Implement using existing architecture.

Prefer:

- reusable components
- server components where appropriate
- shared layouts
- existing UI patterns

Avoid introducing new visual patterns unless necessary.

See:

- `docs/frontend.md`
- `docs/ui-guidelines.md`

---

## 8. Security Review

Every feature should be reviewed for:

- authentication
- authorization
- tenant isolation
- input validation
- XSS
- CSRF
- SQL injection
- rate limiting
- secret handling
- upload validation
- sensitive data exposure

See `docs/security.md`.

---

## 9. Performance Review

Consider:

- unnecessary renders
- unnecessary API requests
- large database queries
- N+1 queries
- caching opportunities
- pagination
- lazy loading
- bundle size

Optimize only where it provides measurable value.

---

## 10. Error Handling

Handle expected failures gracefully.

- validate input
- return meaningful errors
- log unexpected failures
- avoid leaking internal details
- provide user-friendly feedback

Never ignore errors.

---

## 11. Testing

When applicable, add or update:

- unit tests
- integration tests
- end-to-end tests

Verify:

- happy paths
- validation failures
- authorization failures
- edge cases
- regressions

See `docs/testing.md`.

---

## 12. Documentation

Update documentation whenever the feature changes:

- architecture
- API
- database
- UI conventions
- deployment
- security
- workflows

Documentation should always match the implementation.

---

# Feature Checklist

Before marking a feature complete, verify:

- Requirements are fully implemented.
- Existing architecture was followed.
- Existing components were reused where possible.
- No duplicate business logic was introduced.
- Database changes are folded into `full_schema.sql`.
- API follows project standards.
- Tenant isolation is preserved.
- Authorization is enforced.
- Validation is complete.
- UI is consistent with existing pages.
- Responsive behavior is verified.
- Loading, empty, and error states are implemented.
- Performance has been considered.
- Documentation has been updated.
- Tests have been added or updated.
- TypeScript passes.
- ESLint passes.
- The project builds successfully.
- Existing functionality continues to work.

---

# Definition of Done

A feature is complete only when:

- functionality works correctly
- security is not weakened
- architecture remains consistent
- code is maintainable
- documentation is current
- testing is complete
- verification passes
- the feature integrates naturally with the rest of the platform

Completing the implementation alone does not mean the feature is finished.
