---
name: Bug report
about: Report a reproducible problem in MultiTree
title: "[Bug]: "
labels:
  - bug
assignees: []
---

# Bug Report

## Summary

Describe the problem clearly and briefly.

## Affected Area

* [ ] Public linktree
* [ ] Public mini-website
* [ ] Business dashboard
* [ ] Platform administration
* [ ] Authentication or sessions
* [ ] Permissions or tenant isolation
* [ ] Developer API
* [ ] Analytics or CRM
* [ ] Uploads or storage
* [ ] Database or migrations
* [ ] Redis, cache, or queues
* [ ] Deployment or infrastructure
* [ ] Other

## Environment

* MultiTree version or commit:
* Environment: development / staging / production
* Browser and version:
* Operating system:
* Node.js version:
* pnpm version:
* Database version:
* Redis version:

Only include values relevant to the problem.

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

Describe what should have happened.

## Actual Behavior

Describe what happened instead.

## Reproducibility

* [ ] Always
* [ ] Frequently
* [ ] Intermittently
* [ ] Happened once

## Impact

* [ ] Blocks all users
* [ ] Blocks one business or tenant
* [ ] Breaks a major feature
* [ ] Breaks a minor feature
* [ ] Causes incorrect data
* [ ] Causes performance degradation
* [ ] Causes a security concern
* [ ] Cosmetic only

## Logs and Errors

Paste relevant sanitized logs, stack traces, or error messages.

```text
```

Do not include:

* passwords
* session cookies
* API keys
* tokens
* encryption keys
* private customer data
* production secrets

## Screenshots or Recordings

Add screenshots or recordings when they help explain the issue.

## Tenant and Security Checks

* [ ] The issue may involve cross-tenant data access
* [ ] The issue may involve incorrect authorization
* [ ] The issue may expose sensitive information
* [ ] The issue does not appear security-related

Do not post exploitable security details publicly. Report serious vulnerabilities through the repository's private security-reporting process.

## Database or Migration Context

Describe any related:

* migration
* schema change
* failed query
* corrupted data
* reset or seed operation

Write `Not applicable` when unrelated.

## Recent Changes

List any deployment, dependency update, migration, configuration change, or feature release that may be related.

## Additional Context

Add any other information that could help reproduce or diagnose the issue.

## Verification Checklist

* [ ] I searched existing issues for duplicates.
* [ ] I reproduced the issue on the latest available version.
* [ ] I removed secrets and private data from this report.
* [ ] I included clear reproduction steps.
