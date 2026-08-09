# Performance

This document defines the performance standards and optimization principles for MultiTree.

Performance is important, but it should never come at the cost of correctness, security, maintainability, or readability.

Optimize based on measured bottlenecks rather than assumptions.

---

# Performance Principles

Always prioritize:

1. Correctness
2. Security
3. Maintainability
4. Performance

Write clean code first.

Optimize only after identifying real bottlenecks.

Avoid premature optimization.

---

# General Guidelines

Aim to:

- reduce unnecessary work
- minimize network requests
- reduce rendering cost
- reduce database load
- minimize bundle size
- avoid duplicate computations
- cache expensive operations when appropriate

Every optimization should have a measurable benefit.

---

# Frontend Performance

## Rendering

Prefer:

- Server Components where appropriate
- static rendering when possible
- streaming for large pages
- partial hydration where beneficial

Avoid unnecessary Client Components.

Only use client-side rendering when interaction requires it.

---

## React

Keep components focused.

Avoid:

- unnecessary re-renders
- unnecessary state
- deeply nested component trees
- excessive prop drilling

Use:

- memoization only when beneficial
- stable keys
- lazy loading
- code splitting

Do not optimize blindly.

---

## Data Fetching

Avoid duplicate requests.

Reuse existing data whenever practical.

Fetch only the data required for the current view.

Prefer server-side data fetching when appropriate.

---

## Images

Always:

- optimize images
- serve appropriate image sizes
- lazy load below-the-fold images
- compress uploaded images

Avoid oversized assets.

---

## Assets

Keep JavaScript bundles as small as practical.

Lazy load:

- large components
- editors
- charts
- heavy third-party libraries

Remove unused dependencies.

---

# Backend Performance

## Services

Keep business logic efficient.

Avoid:

- repeated calculations
- duplicated queries
- unnecessary object creation

Reuse shared services.

---

## Database

Avoid:

- N+1 queries
- unnecessary joins
- unnecessary SELECT *
- duplicate queries

Prefer:

- indexed lookups
- pagination
- filtering
- batching where appropriate

Review query execution plans for expensive operations.

---

## Transactions

Use transactions only when multiple writes must succeed together.

Keep transactions short.

Avoid unnecessary locking.

---

## Caching

Redis should cache:

- expensive computations
- frequently accessed public data
- session data
- rate-limiting data

Do not cache permanently changing data without a clear invalidation strategy.

Always invalidate affected cache entries after relevant updates.

---

## Background Processing

Move long-running work out of request handlers when appropriate.

Examples:

- notifications
- webhook delivery
- analytics processing
- media processing
- scheduled tasks

Keep HTTP responses fast.

---

# API Performance

API endpoints should:

- return only required fields
- paginate large collections
- support filtering
- support sorting

Avoid returning excessive data.

---

# Database Performance

Schema changes should consider:

- indexes
- foreign keys
- query patterns
- table growth
- migration impact

Remove unnecessary indexes.

Do not create indexes without understanding their cost.

---

# Network Performance

Reduce:

- request count
- response size
- unnecessary redirects

Compress responses when appropriate.

---

# Multi-Tenant Performance

Performance optimizations must never compromise tenant isolation.

All cached data must remain correctly scoped.

Never allow cached data from one tenant to be served to another.

---

# Monitoring

Monitor:

- response times
- database performance
- cache hit rates
- queue lengths
- memory usage
- CPU usage
- slow queries
- request latency

Investigate performance regressions promptly.

---

# Performance Testing

Test performance when introducing:

- new database queries
- large data processing
- background jobs
- file uploads
- analytics features
- caching changes

Measure before and after optimization.

---

# Common Performance Mistakes

Avoid:

- premature optimization
- duplicate API calls
- unnecessary database queries
- unnecessary React state
- loading unnecessary JavaScript
- oversized images
- duplicate business logic
- synchronous long-running work
- excessive polling
- memory leaks

---

# Performance Checklist

Before completing a feature, verify:

- No unnecessary database queries were introduced.
- N+1 query issues have been avoided.
- Expensive operations are cached where appropriate.
- Cache invalidation is correct.
- Frontend rendering remains efficient.
- Large components are lazy loaded when appropriate.
- Images are optimized.
- API responses return only necessary data.
- Pagination is implemented for large collections.
- Background work is queued when appropriate.
- Tenant isolation is preserved in all caches.
- No measurable performance regressions were introduced.