# Business Sub-Managers

Domain-specific managers that prevent BusinessManager from becoming a God Object.

## Rules

- Sub-managers NEVER import each other
- Only BusinessManager imports and coordinates sub-managers
- All receive `context` and extract dependencies from it
- No infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT)

## Current Managers

| Manager | File | Lines |
|---------|------|-------|
| Accommodation | `business-accommodation.manager.js` | 413 |
| Brand | `business-brand.manager.js` | ~40 |
| Owner | `business-owner.manager.js` | ~30 |
| Search | `business-search.manager.js` | ~50 |
| Statistics | `business-statistics.manager.js` | ~30 |
| CMS | `business-cms.manager.js` | ~35 |
| Availability | `business-availability.manager.js` | ~420 |
| Reservation | `business-reservation.manager.js` | ~550 |
| Visitor | `business-visitor.manager.js` | ~850 |

## Future Managers (Stubs Only)

- `BusinessPaymentManager` — P13.6
- `BusinessNotificationManager` — P13.7
- `BusinessWorkflowManager` — P14+
