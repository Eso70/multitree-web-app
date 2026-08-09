# Contributing

Thank you for contributing to MultiTree.

This document describes the expected workflow for contributing to the project.

For engineering principles, see `AGENTS.md`.

For implementation details, see the relevant documentation under `docs/`.

---

# Before You Start

Before implementing any change:

- read `README.md`
- read `AGENTS.md`
- review the relevant documentation in `docs/`
- understand the existing architecture
- search for reusable implementations

Do not implement new functionality without understanding the existing codebase.

---

# Development Principles

Every contribution should:

- improve the codebase
- follow the existing architecture
- preserve security
- maintain tenant isolation
- reuse existing code
- maintain UI consistency
- keep the project maintainable

Avoid introducing unnecessary complexity.

---

# Workflow

The standard workflow is:

1. Understand the requirement.
2. Review existing implementations.
3. Design the solution.
4. Implement the change.
5. Test the implementation.
6. Update documentation if needed.
7. Verify the project.
8. Submit the change.

---

# Code Standards

Every contribution should:

- follow the repository architecture
- use strict TypeScript
- avoid duplicated code
- avoid dead code
- avoid unnecessary abstractions
- use meaningful naming
- keep functions and components focused

Follow the repository coding standards documented in:

- `AGENTS.md`
- `docs/coding-standards.md`

---

# UI Changes

Frontend contributions should:

- reuse existing components
- follow existing layouts
- follow the design system
- preserve consistent spacing
- preserve typography
- preserve loading states
- preserve error states
- preserve responsive behavior

Avoid introducing new UI patterns unless they solve a new problem.

---

# Backend Changes

Backend contributions should:

- keep controllers thin
- keep business logic in services
- validate all inputs
- enforce authorization
- preserve tenant isolation
- avoid duplicated queries

Follow the architecture documented in `docs/backend.md`.

---

# Database Changes

When modifying the database:

- update the consolidated `full_schema.sql`
- do not create dated forward migration files
- reset only disposable databases; plan explicit replacement for valuable data
- review indexes where appropriate

See `docs/database.md`.

---

# Security

Every contribution should consider:

- authentication
- authorization
- tenant isolation
- input validation
- rate limiting
- secret handling
- upload validation

Security should never be weakened.

See `docs/security.md`.

---

# Testing

Before submitting changes, verify:

- TypeScript passes
- ESLint passes
- tests pass
- build succeeds
- existing functionality still works

Run the appropriate verification commands documented in `docs/testing.md`.

---

# Documentation

Update documentation whenever changes affect:

- architecture
- APIs
- database
- UI conventions
- deployment
- workflows
- security

Documentation should always match the implementation.

---

# Pull Requests

A pull request should:

- solve a single logical problem
- avoid unrelated changes
- keep commits focused
- include documentation updates when required
- pass all verification checks

Large changes should be divided into smaller, reviewable pull requests whenever practical.

---

# Review Checklist

Before requesting review, verify:

- Code follows project conventions.
- Existing implementations were reused where appropriate.
- No duplicate logic was introduced.
- No dead code remains.
- TypeScript passes.
- ESLint passes.
- Tests pass.
- Build succeeds.
- Documentation is updated.
- Security is preserved.
- UI remains consistent.
- Tenant isolation is maintained.

---

# Definition of Done

A contribution is complete only when:

- the implementation is correct
- the architecture remains consistent
- security is preserved
- documentation is updated
- verification passes
- the change integrates naturally with the rest of the platform

Completing the code alone does not mean the work is finished.
