# Error Handling

This document defines the standard error-handling strategy for MultiTree.

For authentication, authorization, encryption, and security controls, see `docs/security.md`.

For API response conventions, see `docs/api-standards.md`.

---

# Principles

Errors should be:

- predictable
- consistent
- secure
- actionable
- properly logged

The application should fail gracefully whenever possible.

Never expose sensitive implementation details to users.

---

# General Rules

Always:

- validate input before processing
- handle expected failures
- log unexpected failures
- return meaningful error messages
- preserve application stability
- clean up resources when necessary

Never:

- ignore exceptions
- swallow errors silently
- expose stack traces
- expose SQL queries
- expose file paths
- expose internal identifiers
- expose secrets

---

# Error Categories

Handle errors according to their type.

## Validation Errors

Examples:

- invalid request body
- invalid query parameter
- invalid file upload
- missing required field

Return:

- HTTP 400 or 422
- clear validation messages
- field-specific details when appropriate

---

## Authentication Errors

Examples:

- invalid credentials
- expired session
- missing token
- invalid API key

Return:

- HTTP 401

Never reveal which credential failed.

---

## Authorization Errors

Examples:

- insufficient permissions
- feature not included in subscription
- approval required
- tenant mismatch

Return:

- HTTP 403

Do not leak information about protected resources.

---

## Resource Errors

Examples:

- missing business
- missing linktree
- missing mini-website
- missing asset

Return:

- HTTP 404

Do not reveal whether inaccessible resources exist.

---

## Conflict Errors

Examples:

- duplicate slug
- duplicate username
- duplicate API key name
- optimistic concurrency conflict

Return:

- HTTP 409

Include enough information for clients to resolve the conflict.

---

## Business Rule Errors

Examples:

- subscription limit reached
- template unavailable
- quota exceeded
- operation not allowed

Return:

- HTTP 422

Explain the violated business rule.

---

## Rate Limiting

Return:

- HTTP 429

Include retry information when available.

---

## Server Errors

Unexpected failures should return:

- HTTP 500

Users should receive a generic message.

Internal details should only be logged on the server.

---

# API Error Format

Errors should follow a consistent structure.

Example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": []
  }
}