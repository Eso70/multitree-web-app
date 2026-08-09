# API Standards

The developer API is mounted at `/api/v1` and uses bearer API keys created by a platform administrator. API clients are bound to one business and one environment (`production` or `sandbox`).

Keys are HMAC-SHA256 hashed at rest with constant-time comparison. See `docs/security.md` for implementation details.

This document defines both the implemented API surface and the conventions every new endpoint must follow.

## Boundary validation

Every backend request is processed by the global request-boundary and
validation pipes before business services. UUID route parameters and bounded
numeric pagination queries use centralized checks. Request bodies must be DTOs
with explicit `class-validator` decorators; unknown properties are rejected,
not silently discarded. Enum actions and nested arrays are validated at the
controller boundary. Link synchronization accepts its established `links` and
`createLinks` compatibility forms, but each array is limited to 500 nested
items; link URLs must be absolute HTTP(S) URLs and deletion identifiers must
be UUIDs. Controllers must not rely on service-layer parsing for malformed
request data.

Administration table endpoints use `page`, `limit`, `search`, and applicable
`status` filters. `limit` is capped at 100. Paginated payloads expose
`pagination: { page, limit, total, totalPages }`; summary counters describe the
complete filtered or platform dataset as documented by each endpoint, never
only the current page. Selector endpoints return bounded summary options and
must not reuse sensitive detail projections.

---

# API Principles

All APIs should be:

- RESTful
- predictable
- consistent
- versioned
- secure
- idempotent where appropriate
- backward compatible whenever practical

Breaking changes should be avoided.

---

# URL Design

Use nouns instead of verbs.

Good examples:

```
GET    /api/v1/linktrees
GET    /api/v1/linktrees/:id
POST   /api/v1/linktrees
PATCH  /api/v1/linktrees/:id
DELETE /api/v1/linktrees/:id
```

Avoid action-style routes unless the action is a distinct operation.

Examples:

```
POST /api/v1/linktrees/:id/publish
POST /api/v1/linktrees/:id/unpublish
```

---

# HTTP Methods

| Method | Purpose                 |
| ------ | ----------------------- |
| GET    | Read                    |
| POST   | Create                  |
| PATCH  | Partial update          |
| PUT    | Full replacement (rare) |
| DELETE | Remove                  |

---

# Status Codes

Use standard HTTP status codes.

Common responses:

| Code | Meaning                    |
| ---- | -------------------------- |
| 200  | Success                    |
| 201  | Created                    |
| 204  | No Content                 |
| 400  | Validation error           |
| 401  | Authentication required    |
| 403  | Forbidden                  |
| 404  | Not Found                  |
| 409  | Conflict                   |
| 410  | Permanently removed        |
| 413  | Request body too large     |
| 415  | Unsupported media type     |
| 422  | Business rule violation    |
| 429  | Rate limited               |
| 500  | Internal Server Error      |
| 502  | Invalid upstream response  |
| 503  | Temporarily unavailable    |
| 504  | Upstream request timed out |

---

# Validation

Validate every request.

This includes:

- request body
- query parameters
- route parameters
- uploaded files

Reject invalid requests before business logic executes.

---

# Response Consistency

Internal JSON APIs use this success envelope:

```json
{
  "success": true,
  "data": { "...": "..." }
}
```

`data` may be omitted for an operation with no response value. A transitional
response interceptor adds this envelope to older raw controller responses and
retains their former top-level fields so existing browser clients continue to
work. New controllers must return only the canonical envelope and must not add
new top-level compatibility fields.

Canonical response payloads shared with the frontend belong in
`packages/types` and are named for their endpoint projection. Database row
types remain private to the backend; frontend code must import the shared
transport contract rather than redeclaring an approximate local interface.

Internal errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": []
  },
  "requestId": "request-id"
}
```

The global exception filter supplies stable codes, converts validation message
arrays into `error.details`, and returns a generic message for unexpected
server failures. The server logs the underlying unexpected error with the
request ID; it is never exposed to the client.

The versioned developer API keeps its established success response unchanged:

```json
{
  "success": true,
  "data": { "...": "..." }
}
```

Developer API errors use the same `error` object plus
`meta: { "version": "v1", "requestId": "..." }`. Existing top-level
`statusCode`, `code`, `message`, and explicit guard fields are retained as
compatibility aliases for current `/api/v1` consumers. New clients should read
the nested error contract. A future API version may remove those aliases only
as an explicit versioned change.

---

# Pagination

Large collections should support pagination.

Prefer consistent parameters:

```
?page=1
&pageSize=25
```

Return pagination metadata whenever applicable.

---

# Filtering and Sorting

Collection endpoints should support filtering where appropriate.

Examples:

```
?status=published
?sort=name
?order=asc
```

---

# Idempotency

Mutating operations that may be retried should support:

```
Idempotency-Key
```

Duplicate requests should not create duplicate side effects.

---

# Versioning

The current API version is:

```
/api/v1
```

New versions should remain backward compatible whenever practical.

Avoid breaking existing clients.

---

# Authentication

The Developer API authenticates using Bearer API keys.

Clients are scoped to:

- one business
- one environment

Every request is evaluated against:

- scopes
- business entitlement
- rate limits
- IP allowlists
- suspension status

---

# Operations

Implemented API operations include:

- list, read, create, update, delete, clone, publish, and unpublish linktrees
- preview linktrees
- slug availability
- bulk operations
- publication scheduling
- link management
- analytics summary
- analytics reports
- CSV exports
- template listing
- uploaded asset management

---

# Scopes

```
linktrees:read
linktrees:write
linktrees:publish
linktrees:delete
links:read
links:manage
assets:read
assets:write
slugs:write
schedules:read
schedules:write
templates:read
bulk:write
analytics:read
analytics:export
```

Every endpoint should require the minimum scope necessary.

---

# Rate Limits

API access is additionally controlled through:

- business entitlements
- per-minute rate limits
- monthly quotas
- optional automatic suspension
- IP allowlists
- usage accounting
- Idempotency-Key replay protection

Per-minute developer API limits use UTC fixed windows. The Redis key expires
at the next minute boundary rather than remaining alive beyond its window.
Tenant `business_api` access rules are evaluated before request accounting.
Actionable HTTP `429` responses include `Retry-After` with the number of
seconds before the relevant rate-limit window permits another attempt. Monthly
quota exhaustion does not advertise a short retry interval.

See `docs/security.md` for implementation details.

---

# Webhooks

Webhook endpoints must:

- use HTTPS
- avoid embedded credentials
- avoid private-network destinations
- validate HMAC signatures
- handle duplicate deliveries safely

Deliveries:

- are stored durably
- retry up to six times
- disable endpoints after twenty consecutive failures

The same background processor also executes scheduled linktree publications.

Implementation details, retry timing, signature format, and SSRF protection are documented in `docs/security.md`.

---

# API Checklist

Before adding a new endpoint verify:

- URL follows REST conventions.
- Validation is complete.
- Authorization is enforced.
- Tenant isolation is preserved.
- Response format is consistent.
- Correct status codes are returned.
- Idempotency is supported where appropriate.
- Rate limits are respected.
- API documentation is updated.
