# Visitor Capability

Pure business customer domain, independent of Authentication, Identity, JWT, OAuth, and infrastructure.

## Files

| File | Purpose |
|------|---------|
| `visitor.status.js` | 8 statuses + helpers |
| `visitor.events.js` | 20 events |
| `visitor.errors.js` | Error hierarchy (8 classes) |
| `visitor.permissions.js` | 10 permissions |
| `visitor.schema.js` | Schema factory |
| `visitor.workflow.js` | State machine |
| `visitor.validation.js` | Validation functions |
| `visitor.profile.js` | Profile model |
| `visitor.preferences.js` | Preference model |
| `visitor.statistics.js` | Pure calculation functions |
| `visitor.search.js` | Search payload generator |
| `visitor.manager.js` | Central orchestrator |
| `visitor.service.js` | Thin public API |
| `visitor.capability.js` | BaseCapability subclass |

## States

Anonymous → Registered → Verified → Active → VIP → Inactive → Archived → Deleted

## Events

20 events covering create, update, delete, archive, restore, merge, verify, activate, deactivate, VIP, blacklist, profile, preferences, statistics, tags.

## Permissions

10 permissions: create, read, update, delete, archive, restore, merge, view_statistics, update_preferences, update_profile.

## Design

- Zero imports from Authentication, Authorization, Business, Reservation, Availability, Accommodation, Payment, Notification
- Persistence only through `context.repositories.visitor`
- Workflow owns all state transitions
- Statistics are pure calculations
- Profile and preferences are separate domain objects
