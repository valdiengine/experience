# Notification Capability

> P13.7 — Domain-only notification lifecycle management.
> No providers, HTTP, queues, or workers. Pure domain model.

---

## Purpose

Domain-only notification capability. Manages notification lifecycle, status transitions, templates, preferences, channels, and analytics. Does NOT handle delivery (no providers, no HTTP calls, no queue workers).

External delivery systems consume notification records and handle delivery separately.

---

## Architecture Rule

**NotificationCapability MUST NOT import any provider, HTTP, queue, or worker modules.**

All communication:
- `context.repositories.notification` — data access
- `context.eventBus` — domain events
- `context.runtime.search` — search indexing
- `context.runtime.auth` — authorization

---

## Aggregate Boundaries

```
NotificationCapability (domain only)
    ├── notification.status / notification.workflow     → state transitions
    ├── notification.validation                         → validation rules
    ├── notification.permissions                        → 10 permissions
    ├── notification.events                             → 14 events
    ├── notification.manager                            → all lifecycle logic
    ├── notification.service                            → public API
    ├── notification.templates                          → template model
    ├── notification.preferences                        → preferences model
    ├── notification.channels                           → domain channels
    ├── notification.search                             → search payload
    ├── notification.schema                            → validation schema
    └── notification.errors                            → error hierarchy

NOT included (handled externally):
    ├── email/SMS/push/whatsapp providers
    ├── HTTP delivery clients
    ├── queue producers/consumers
    ├── worker processes
```

---

## Status Model

10 statuses: `DRAFT`, `PENDING`, `SCHEDULED`, `PROCESSING`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`, `ARCHIVED`, `DELETED`

Status predicates: `isPending()`, `isCompleted()`, `isFailed()`, `isTerminal()`, `isRetryable()`, `canTransitionTo()`, `canCancel()`, `canRetry()`, `canArchive()`, `canDelete()`

---

## Workflow Transitions

```
DRAFT → PENDING, CANCELLED, DELETED
PENDING → SCHEDULED, PROCESSING, CANCELLED, FAILED
SCHEDULED → PROCESSING, CANCELLED, FAILED
PROCESSING → SENT, DELIVERED, FAILED, CANCELLED
SENT → DELIVERED, FAILED, ARCHIVED
DELIVERED → ARCHIVED
FAILED → PENDING, CANCELLED, ARCHIVED
CANCELLED → ARCHIVED
ARCHIVED → RESTORED
DELETED → (terminal, no transitions)
```

---

## Method Catalog

### Lifecycle (NotificationManager)

| Method | Purpose |
|--------|---------|
| `createNotification` | Create new notification (DRAFT status) |
| `updateNotification` | Update notification fields |
| `scheduleNotification` | Schedule for future delivery |
| `sendNotification` | Initiate sending (→ PROCESSING) |
| `cancelNotification` | Cancel notification |
| `retryNotification` | Retry failed notification |
| `markSent` | Mark as sent (→ SENT) |
| `markDelivered` | Mark as delivered (→ DELIVERED) |
| `markFailed` | Mark as failed (→ FAILED) |
| `archiveNotification` | Archive notification |
| `restoreNotification` | Restore from archive |
| `deleteNotification` | Delete notification |

### Queries (NotificationManager)

| Method | Purpose |
|--------|---------|
| `getNotification` | Get by ID |
| `findNotifications` | Filter search |
| `findByRecipient` | By recipient |
| `findByBusiness` | By business |
| `findByReservation` | By reservation |
| `findByPayment` | By payment |
| `findPending` | Pending notifications |
| `findScheduled` | Scheduled notifications |
| `findSent` | Sent notifications |
| `findFailed` | Failed notifications |
| `findArchived` | Archived notifications |

### Analytics (NotificationManager)

| Method | Purpose |
|--------|---------|
| `getNotificationStatistics` | Full stats by status/channel/type |
| `getDeliveryRate` | Delivery percentage |
| `getFailureRate` | Failure percentage |
| `getChannelStatistics` | Per-channel breakdown |

---

## Events (14)

| Event | Emitted When |
|-------|-------------|
| `notification:created` | Notification created |
| `notification:updated` | Notification updated |
| `notification:scheduled` | Scheduled for future |
| `notification:processing` | Sending initiated |
| `notification:sent` | Sent to delivery |
| `notification:delivered` | Confirmed delivered |
| `notification:failed` | Delivery failed |
| `notification:retried` | Retry initiated |
| `notification:cancelled` | Cancelled |
| `notification:archived` | Archived |
| `notification:restored` | Restored from archive |
| `notification:deleted` | Deleted |
| `notification:preferences_updated` | Preferences changed |
| `notification:error` | Error occurred |

---

## Permissions (10)

| Permission | Purpose |
|------------|---------|
| `notification:create` | Create notifications |
| `notification:read` | Read notifications |
| `notification:update` | Update notifications |
| `notification:delete` | Delete notifications |
| `notification:send` | Send/cancel/retry |
| `notification:archive` | Archive/restore |
| `notification:manage_templates` | Manage templates |
| `notification:manage_preferences` | Manage preferences |
| `notification:analytics` | View analytics |

---

## Validation

- `validateCreateData` — validates required fields, types, business ownership
- `validateUpdateData` — validates mutable fields, status constraints
- `validateCancel` — checks if cancellation is allowed
- `validateRetry` — checks if retry is allowed
- `validateArchive` — checks if archive is allowed
- `validateDelete` — checks if deletion is allowed

---

## Files

| File | Purpose |
|------|---------|
| `notification.capability.js` | Capability entry point |
| `notification.service.js` | Public API layer |
| `notification.manager.js` | Orchestrator (29 methods) |
| `notification.status.js` | Status model + predicates |
| `notification.channels.js` | Domain channels |
| `notification.events.js` | 14 events |
| `notification.errors.js` | Error hierarchy |
| `notification.permissions.js` | 10 permissions |
| `notification.schema.js` | Validation schema |
| `notification.validation.js` | Validation logic |
| `notification.workflow.js` | Transition map |
| `notification.templates.js` | Template model |
| `notification.preferences.js` | Preferences model |
| `notification.search.js` | Search payload |

---

## Dependency Graph

```
NotificationCapability
    │
    ├──► NotificationManager
    │        │
    │        ├──► context.repositories.notification
    │        ├──► context.eventBus
    │        ├──► context.runtime.search
    │        └──► context.runtime.auth
    │
    ├──► NotificationService
    │        └──► NotificationManager
    │
    └──► NOTIFICATION_EVENTS
```

---

## Coexistence with NotificationsCapability

Two notification capabilities exist:

| Aspect | `notification` (P13.7) | `notifications` (v2.0) |
|--------|------------------------|------------------------|
| Path | `capabilities/notification/` | `capabilities/notifications/` |
| Providers | None | Email, Push, WhatsApp |
| HTTP/Queues | None | Yes |
| Purpose | Domain model only | Full delivery engine |
| ID | `notification` | `notifications` |

P13.7 provides the domain model. External systems consume notification records and handle delivery via the existing `notifications` capability or custom integrations.
