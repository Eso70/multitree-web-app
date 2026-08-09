# Observability

This document defines the observability standards for MultiTree.

Observability enables developers and operators to understand the health, performance, and behavior of the platform in development and production.

Monitoring should help detect, diagnose, and resolve problems quickly.

---

# Principles

The platform should be observable through:

- structured logging
- health checks
- metrics
- tracing
- audit events
- alerts

Observability should provide enough context to diagnose issues without exposing sensitive information.

---

# Logging

## General Rules

Logs should be:

- structured
- consistent
- searchable
- meaningful

Every log entry should include enough context to understand what happened.

Avoid unnecessary or noisy logs.

---

## Log Levels

Use appropriate log levels.

### Debug

Development-only diagnostic information.

Do not rely on debug logs in production.

---

### Information

Normal application events.

Examples:

- application startup
- successful background jobs
- scheduled tasks
- cache warm-up

---

### Warning

Unexpected situations that do not stop processing.

Examples:

- retryable failures
- slow external services
- quota nearing limits
- deprecated API usage

---

### Error

Failures affecting one request or operation.

Examples:

- failed database transaction
- failed webhook delivery
- unexpected exception
- upload failure

---

### Fatal

Failures preventing normal application operation.

Examples:

- startup failure
- database unavailable
- configuration failure
- corrupted environment

---

# Structured Logging

Prefer structured logs over plain text.

Every completed backend request emits a JSON log event with request ID,
tenant or API-client identifiers when authenticated, method, normalized route,
status, and duration. The raw query string and sensitive headers are omitted.

Include useful context such as:

- timestamp
- request ID
- tenant ID
- authenticated user ID
- business ID
- API client ID
- endpoint
- HTTP method
- response status
- execution time

Do not log unnecessary information.

---

# Sensitive Data

Never log:

- passwords
- session tokens
- JWTs
- API keys
- encryption keys
- cookies
- OTP codes
- payment information
- personal secrets

Sensitive values should be masked or omitted.

---

# Request Correlation

Every request should be traceable.

When available, logs should include:

- request ID
- correlation ID
- background job ID
- webhook delivery ID

This allows events across services to be connected.

---

# Health Checks

## Implemented endpoints

- `GET /health/live` is public and reports process liveness only.
- `GET /health/ready` is internal and checks PostgreSQL, Redis, the configured
  storage driver, and worker heartbeats. It returns `503` when any component
  is down.
- `GET /internal/metrics` is internal and returns bounded per-process HTTP and
  worker metrics.

Internal endpoints require `x-operations-key` matching `OPERATIONS_SECRET`.
They expose component names and timing but never raw dependency errors,
credentials, request bodies, cookies, authorization headers, or tokens.

Provide health endpoints that verify:

- backend availability
- database connectivity
- Redis connectivity
- storage availability
- background worker status

Health endpoints should not expose internal implementation details publicly.

---

# Metrics

The backend currently records request totals, server errors, status classes,
latency buckets, and background-worker run success/failure in bounded memory.
These per-process values reset at restart. Production monitoring should
scrape and centralize them before applying alert rules.

Track important operational metrics.

Examples:

Application

- request count
- response time
- error rate
- active sessions

Database

- query duration
- slow queries
- connection pool usage

Redis

- cache hit rate
- cache misses
- connection status

Uploads

- upload failures
- storage usage

Background Jobs

- queued jobs
- completed jobs
- failed jobs
- retry count

Developer API

- requests
- rate-limit hits
- webhook deliveries

---

# Tracing

Distributed tracing is not yet implemented. Request IDs are returned in the
`X-Request-ID` response header and included with structured request logs so
operators have correlation now without adding a tracing backend prematurely.

Long-running operations should be traceable.

Examples:

- API requests
- background jobs
- webhook delivery
- analytics processing
- upload processing

Tracing should make bottlenecks easy to identify.

---

# Audit Events

Security-sensitive operations should generate immutable audit events.

Examples:

- authentication
- authorization failures
- permission changes
- administrator actions
- business management
- API key creation
- API key deletion
- webhook changes
- subscription changes

See `docs/security.md` for audit requirements.

---

# Monitoring

Monitor:

- application availability
- HTTP response times
- database performance
- Redis performance
- queue health
- upload failures
- storage usage
- memory usage
- CPU usage
- disk usage

Unexpected changes should be investigated promptly.

---

# Alerts

Alerts should focus on actionable issues.

Examples:

- application unavailable
- database unavailable
- Redis unavailable
- repeated failed deployments
- excessive error rate
- webhook failures
- unusually slow responses
- failed background jobs
- storage nearly full

Avoid excessive alert noise.

---

# Error Investigation

When investigating production issues:

1. Check health status.
2. Review recent deployments.
3. Examine structured logs.
4. Review metrics.
5. Trace affected requests.
6. Verify database health.
7. Verify Redis health.
8. Confirm external service availability.
9. Review audit events if security-related.

---

# Retention

Retain logs and metrics according to the platform's operational data-retention
policy. Security audit events are permanent application evidence and are not
part of retention cleanup.

Automatically remove expired operational data where appropriate.

See `docs/security.md` and `docs/backend.md` for retention configuration.

---

# Performance Monitoring

Regularly review:

- slow endpoints
- slow database queries
- cache efficiency
- memory consumption
- CPU utilization
- bundle size
- queue latency

Performance regressions should be identified before they affect users.

---

# Incident Response

When production incidents occur:

- identify affected systems
- limit user impact
- preserve diagnostic information
- resolve the root cause
- verify recovery
- document lessons learned

Avoid temporary fixes that leave underlying issues unresolved.

---

# Observability Checklist

Before deploying a significant feature, verify:

- Important events are logged.
- Sensitive information is never logged.
- Errors include sufficient diagnostic context.
- Health checks remain accurate.
- Metrics cover new functionality.
- Background jobs are observable.
- Audit events are generated where required.
- Performance metrics show no significant regression.
- Alerts remain meaningful and actionable.
