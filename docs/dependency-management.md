# Dependency Management

This document defines the dependency management standards for MultiTree.

Dependencies are part of the application's architecture and security. Every new dependency increases maintenance, security, and upgrade costs.

Prefer the smallest, safest, and most actively maintained dependency set possible.

---

# Principles

When selecting dependencies, prioritize:

1. Security
2. Long-term maintenance
3. Stability
4. Community support
5. Performance
6. Simplicity

Every dependency should provide clear value.

---

# Before Adding a Dependency

Before installing a new package, verify:

- the functionality cannot reasonably be implemented with existing code
- the functionality is not already provided by another dependency
- the package is actively maintained
- the package has good documentation
- the package has a stable release history
- the package has an appropriate license
- the package does not introduce unnecessary complexity

Avoid adding dependencies for small utility functions.

---

# Prefer Existing Solutions

Always check whether the project already provides the required functionality.

Reuse:

- existing utilities
- shared components
- shared services
- helper functions
- internal abstractions

Avoid solving the same problem multiple ways.

---

# Package Selection

Prefer packages that are:

- actively maintained
- widely adopted
- well documented
- TypeScript friendly
- tree-shakeable where applicable
- compatible with the current technology stack

Avoid packages that are:

- deprecated
- abandoned
- poorly documented
- experimental unless intentionally adopted
- unnecessarily large
- difficult to maintain

---

# Package Installation

Install only what is required.

Avoid installing packages that duplicate existing functionality.

Prefer official libraries when available.

Examples:

- official framework packages
- official database drivers
- official SDKs

---

# Version Management

Use consistent versioning throughout the workspace.

Avoid unnecessary major-version upgrades.

Review release notes before upgrading significant dependencies.

After upgrades:

- verify builds
- verify tests
- verify documentation
- verify production behavior

---

# Security

Regularly review dependencies for:

- known vulnerabilities
- deprecated packages
- unsupported packages
- compromised packages

Replace insecure dependencies promptly.

Never ignore critical security advisories.

---

# Updating Dependencies

Update dependencies regularly rather than allowing large upgrade gaps.

Prefer incremental upgrades over large jumps.

After updates, verify:

- builds succeed
- tests pass
- linting passes
- TypeScript passes
- production behavior remains unchanged

---

# Removing Dependencies

Remove dependencies that are:

- unused
- obsolete
- replaced
- no longer maintained

Also remove:

- unused imports
- unused configuration
- unused scripts
- unused documentation

Keep the dependency graph clean.

---

# Development Dependencies

Development dependencies should support:

- building
- testing
- linting
- formatting
- code generation
- local development

Avoid shipping development-only packages in production builds.

---

# Runtime Dependencies

Runtime dependencies should:

- be required by the application
- remain actively maintained
- be updated responsibly
- have minimal impact on startup and bundle size

Avoid unnecessary runtime packages.

---

# Bundle Size

When adding frontend dependencies, consider:

- bundle size
- tree shaking
- lazy loading
- code splitting
- browser compatibility

Large dependencies should provide significant value.

---

# Licensing

Only use dependencies with licenses compatible with the project.

Review license requirements before introducing new packages.

Do not introduce packages with incompatible licensing.

---

# Workspace Consistency

Keep dependency versions consistent across the workspace where practical.

Avoid multiple versions of the same package unless required.

Shared packages should be reused instead of duplicated.

---

# Internal Packages

Prefer internal shared packages for:

- shared types
- shared utilities
- reusable business logic
- reusable validation
- shared constants

Avoid duplicating common functionality across applications.

---

# Experimental Packages

Experimental dependencies should be evaluated carefully before adoption.

Do not build critical functionality on unstable packages without a clear migration strategy.

---

# Verification

After adding, updating, or removing dependencies, verify:

- installation succeeds
- builds succeed
- TypeScript passes
- linting passes
- tests pass
- bundle size remains reasonable
- documentation is updated if required

---

# Dependency Checklist

Before merging dependency-related changes, verify:

- The dependency provides clear value.
- Existing solutions were considered first.
- The package is actively maintained.
- The package is secure.
- The package is appropriately licensed.
- No duplicate functionality was introduced.
- Unused dependencies were removed.
- Runtime impact is acceptable.
- Documentation remains accurate.
- All verification checks pass.

Dependencies should be introduced deliberately, maintained regularly, and removed when they no longer provide value.