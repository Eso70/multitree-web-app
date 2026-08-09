# Pull Request

## Summary

Describe what this change does and why it is needed.

## Type of Change

* [ ] Bug fix
* [ ] New feature
* [ ] Refactor
* [ ] Performance improvement
* [ ] Security improvement
* [ ] Documentation
* [ ] Database or migration
* [ ] Dependency update
* [ ] Deployment or infrastructure
* [ ] Other

## Related Issue

Closes #

## Changes

Summarize the main changes:

*
*
*

## Testing

Describe how the change was verified.

* [ ] TypeScript passes
* [ ] ESLint passes
* [ ] Tests pass
* [ ] Production build succeeds
* [ ] Relevant functionality was manually verified
* [ ] New or updated tests were added where appropriate

Commands run:

```text
pnpm verify
```

Additional testing:

*

## Security and Tenancy

* [ ] Authentication behavior remains correct
* [ ] Authorization is enforced on the backend
* [ ] Tenant isolation is preserved
* [ ] User input is validated
* [ ] Sensitive data is not exposed or logged
* [ ] Upload, webhook, API-key, or secret handling was reviewed where relevant
* [ ] This change does not weaken existing security controls

## Database

* [ ] No database changes
* [ ] A forward migration was added
* [ ] `full_schema.sql` was updated
* [ ] Existing data is preserved
* [ ] Indexes and query performance were reviewed
* [ ] Migration behavior was tested

## Frontend and UI

* [ ] No UI changes
* [ ] Existing components and patterns were reused
* [ ] Business and platform-administration boundaries remain intact
* [ ] Loading, empty, and error states were handled
* [ ] Responsive behavior was verified
* [ ] Keyboard and accessibility behavior was considered
* [ ] Screenshots are included below

## API

* [ ] No API changes
* [ ] Request validation is complete
* [ ] Response and error formats follow project standards
* [ ] Correct HTTP status codes are used
* [ ] Backward compatibility is preserved
* [ ] API documentation was updated

## Performance

* [ ] No unnecessary requests, renders, or queries were introduced
* [ ] Large collections are paginated where appropriate
* [ ] Cache behavior and invalidation were reviewed
* [ ] Long-running work is handled outside request paths where appropriate
* [ ] No meaningful performance regression was introduced

## Documentation

* [ ] No documentation changes required
* [ ] Relevant files under `docs/` were updated
* [ ] `README.md` was updated if onboarding or project behavior changed
* [ ] `AGENTS.md` or `PROJECT_CHECKLIST.md` was updated if project-wide rules changed

## Screenshots

Add screenshots or recordings for visible UI changes.

## Breaking Changes

Describe any breaking change and the required migration steps.

Write `None` when there are no breaking changes.

## Deployment Notes

Document any required:

* environment variables
* migration commands
* cache clearing
* background worker changes
* infrastructure changes
* rollback considerations

Write `None` when no special deployment action is required.

## Final Checklist

* [ ] The change solves one clear problem
* [ ] Unrelated changes were excluded
* [ ] Existing implementations were reused where practical
* [ ] No dead or commented-out code remains
* [ ] No debugging statements remain
* [ ] No duplicate logic was introduced
* [ ] Documentation matches the implementation
* [ ] `PROJECT_CHECKLIST.md` was reviewed
