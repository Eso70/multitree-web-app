# PROJECT CHECKLIST

Every feature, bug fix, refactor, or architectural change should satisfy this checklist before it is considered complete.

If an item does not apply, explicitly verify that it is not relevant.

---

# Planning

- [ ] The requirement is fully understood.
- [ ] Existing implementations were reviewed.
- [ ] Reusable components, services, or utilities were considered before creating new ones.
- [ ] The solution follows the project architecture.

---

# Architecture

- [ ] The change follows `docs/architecture.md`.
- [ ] No architectural boundaries were violated.
- [ ] Business logic is not duplicated.
- [ ] Existing abstractions were reused where appropriate.

---

# Frontend

- [ ] UI follows existing design patterns.
- [ ] Existing components were reused where possible.
- [ ] Responsive behavior works correctly.
- [ ] Loading states are implemented.
- [ ] Empty states are implemented.
- [ ] Error states are implemented.
- [ ] Forms provide clear validation feedback.
- [ ] No unnecessary Client Components were introduced.
- [ ] Accessibility was considered.

---

# Backend

- [ ] Controllers remain thin.
- [ ] Business logic belongs in services.
- [ ] DTO validation is implemented.
- [ ] Authorization is enforced.
- [ ] Tenant isolation is preserved.
- [ ] Database access is efficient.

---

# Database

- [ ] Schema changes were delivered as new dated forward migration files (the `full_schema.sql` baseline was not edited).
- [ ] A forward migration file was created if required.
- [ ] Indexes were reviewed.
- [ ] Queries are efficient.
- [ ] No unnecessary database calls were introduced.
- [ ] Transactions are used where required.

---

# API

- [ ] API remains backward compatible unless intentionally versioned.
- [ ] HTTP status codes are correct.
- [ ] Request validation is complete.
- [ ] Error responses follow project standards.
- [ ] API documentation was updated if necessary.

---

# Security

- [ ] Authentication is correct.
- [ ] Authorization is correct.
- [ ] Input validation is complete.
- [ ] Sensitive data is protected.
- [ ] Secrets are not exposed.
- [ ] File uploads remain secure.
- [ ] SQL injection risks were considered.
- [ ] XSS risks were considered.
- [ ] CSRF protection remains intact where applicable.
- [ ] Rate limiting remains appropriate.

---

# Performance

- [ ] No unnecessary renders were introduced.
- [ ] No unnecessary API calls were introduced.
- [ ] Database queries are optimized.
- [ ] Expensive work is cached when appropriate.
- [ ] Cache invalidation is correct.
- [ ] Background processing is used where appropriate.
- [ ] Large datasets are paginated.

---

# Error Handling

- [ ] Expected failures are handled.
- [ ] Unexpected failures are logged.
- [ ] Users receive meaningful error messages.
- [ ] Sensitive information is never exposed.
- [ ] Edge cases were considered.

---

# Code Quality

- [ ] Strict TypeScript is maintained.
- [ ] No `any` without justification.
- [ ] No dead code.
- [ ] No commented-out code.
- [ ] No unused imports.
- [ ] No debugging statements.
- [ ] Naming is consistent.
- [ ] Functions remain focused.
- [ ] Components remain focused.
- [ ] Complexity is reasonable.

---

# Testing

- [ ] Existing tests still pass.
- [ ] New tests were added where appropriate.
- [ ] Critical paths were manually verified.
- [ ] No regressions were introduced.

---

# Documentation

- [ ] Documentation reflects the implementation.
- [ ] API documentation was updated if needed.
- [ ] Architecture documentation was updated if needed.
- [ ] README remains accurate.
- [ ] Relevant files in `docs/` were updated when required.

---

# Observability

- [ ] Errors are logged appropriately.
- [ ] Important events remain observable.
- [ ] Metrics remain accurate.
- [ ] Audit events were added where required.

---

# Deployment

- [ ] Environment variables are documented if changed.
- [ ] Configuration changes are documented.
- [ ] Existing deployments remain compatible.
- [ ] Migration steps are verified.

---

# Final Verification

Before considering the task complete, verify:

- [ ] Project builds successfully.
- [ ] TypeScript passes.
- [ ] ESLint passes.
- [ ] Tests pass.
- [ ] No duplicate logic exists.
- [ ] No broken functionality exists.
- [ ] UI remains consistent.
- [ ] Security is not weakened.
- [ ] Performance is not significantly degraded.
- [ ] Documentation matches the implementation.

---

# Definition of Done

A task is complete only when:

- the implementation is correct;
- the architecture remains consistent;
- security is preserved;
- performance remains acceptable;
- documentation is updated;
- verification passes; and
- the feature integrates naturally with the rest of the platform.

Code is not considered complete until the entire checklist has been satisfied.
