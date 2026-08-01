# Business Notification Manager

> P13.7.1 — Orchestration layer for business-owned notification lifecycle management.
> Pure orchestration. All notification logic delegated to Notification capability.

---

## Purpose

Bridge the Business capability (aggregate root) with the Notification capability (notification domain). Provides business-level aggregation, notification analytics, reservation coordination, payment coordination, visitor coordination, batch operations, cascade rules, and search sync — while delegating all lifecycle, workflow, validation, permissions, and delivery logic to the Notification capability.

Business owns the **notification relationship** with its customers. Notification remains responsible for notification business logic.

---

## Architecture Rule

**BusinessNotificationManager MUST NOT import anything from `capabilities/notification/`.**

All communication with the Notification domain uses:
- `context.capabilities.get('notification').service` — public service methods
- `context.capabilities.get('notification').manager` — manager methods (when delegation is needed)
- `context.repositories.business` — business lookup + statistics sync
- `context.eventBus` — business notification events
- `context.runtime.search` — search indexing

---

## Aggregate Boundaries

```
Notification capability (pure domain)
    ├── notification.status / notification.workflow        → owns state transitions
    ├── notification.validation                           → owns validation rules
    ├── notification.permissions                         → owns permissions
    ├── notification.manager                             → all lifecycle logic
    ├── notification.service                             → public API
    ├── notification.events                             → 14 notification events

BusinessNotificationManager (orchestration only)
    ├── business ownership checks
    ├── business↔notification relationship (notifications belong to business)
    ├── business-level aggregation, analytics, batch, export, cascade
    ├── reservation coordination (creates notifications for reservations)
    ├── payment coordination (creates notifications for payments)
    ├── visitor coordination (creates notifications for visitors)
```

---

## Delegation Pattern

```
Business Service
    │
    ▼
Business Manager (orchestrator)
    │
    ▼
BusinessNotificationManager
    │
    ├──► context.capabilities.get('notification').service.create()
    ├──► context.capabilities.get('notification').service.update()
    ├──► context.capabilities.get('notification').service.send()
    ├──► context.capabilities.get('notification').service.cancel()
    ├──► context.capabilities.get('notification').service.retry()
    ├──► context.capabilities.get('notification').service.archive()
    ├──► context.capabilities.get('notification').service.restore()
    ├──► context.capabilities.get('notification').service.delete()
    ├──► context.capabilities.get('notification').service.markSent()
    ├──► context.capabilities.get('notification').service.markDelivered()
    ├──► context.capabilities.get('notification').service.markFailed()
    ├──► context.capabilities.get('notification').service.findByBusiness()
    ├──► context.capabilities.get('notification').service.findByReservation()
    ├──► context.capabilities.get('notification').service.findByPayment()
    ├──► context.capabilities.get('notification').service.findByRecipient()
    ├──► context.capabilities.get('notification').manager.getNotificationStatistics()
    ├──► context.capabilities.get('notification').manager.getChannelStatistics()
    └──► context.repositories.business                      (statistics sync)
```

---

## Method Catalog

### Notification Lifecycle

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `createNotification` | `notification.service.create` | Create a new notification for business |
| `updateNotification` | `notification.service.update` | Update notification fields |
| `scheduleNotification` | `notification.service.schedule` | Schedule notification for future |
| `sendNotification` | `notification.service.send` | Send notification |
| `cancelNotification` | `notification.service.cancel` | Cancel a notification |
| `retryNotification` | `notification.service.retry` | Retry failed notification |
| `archiveNotification` | `notification.service.archive` | Archive a notification |
| `restoreNotification` | `notification.service.restore` | Restore an archived notification |
| `deleteNotification` | `notification.service.delete` | Delete a notification |
| `markSent` | `notification.service.markSent` | Mark as sent |
| `markDelivered` | `notification.service.markDelivered` | Mark as delivered |
| `markFailed` | `notification.service.markFailed` | Mark as failed |

### Notification Queries

| Method | Purpose |
|--------|---------|
| `findNotification` | Get by ID with business ownership check |
| `findNotifications` | Filter by status/channel/type/recipient |
| `findBusinessNotifications` | All notifications for the business |
| `findPendingNotifications` | Find pending notifications |
| `findScheduledNotifications` | Find scheduled notifications |
| `findSentNotifications` | Find sent notifications |
| `findFailedNotifications` | Find failed notifications |
| `findDeliveredNotifications` | Find delivered notifications |
| `notificationExists` | Boolean existence check |
| `countNotifications` | Total business notifications |

### Reservation Coordination

| Method | Purpose |
|--------|---------|
| `createReservationNotification` | Create notification linked to reservation |
| `cancelReservationNotifications` | Cancel all notifications for a reservation |
| `findReservationNotifications` | Find notifications by reservation |
| `scheduleReservationReminder` | Schedule reminder for reservation |
| `sendReservationConfirmation` | Send reservation confirmation |
| `sendReservationCancellation` | Send reservation cancellation |

### Payment Coordination

| Method | Purpose |
|--------|---------|
| `createPaymentNotification` | Create notification linked to payment |
| `sendPaymentReceipt` | Send payment receipt |
| `sendRefundNotification` | Send refund notification |
| `findPaymentNotifications` | Find notifications by payment |

### Visitor Coordination

| Method | Purpose |
|--------|---------|
| `findVisitorNotifications` | All notifications for a visitor |
| `findUnreadVisitorNotifications` | Unread notifications for visitor |
| `markVisitorNotificationsRead` | Mark all visitor notifications as read |
| `sendVisitorNotification` | Send notification to visitor |

### Aggregation

| Method | Purpose |
|--------|---------|
| `getNotificationStatistics` | Full stats by status/channel/type |
| `getBusinessNotificationSummary` | Complete notification summary |
| `getDeliveryRate` | Delivery percentage |
| `getFailureRate` | Failure percentage |
| `getChannelStatistics` | Per-channel breakdown |
| `getTemplateStatistics` | Template usage statistics |
| `getDailyNotificationVolume` | Daily notification counts |
| `getNotificationDashboard` | Dashboard with summary and recent |

### Batch Operations

| Method | Purpose |
|--------|---------|
| `archiveBusinessNotifications` | Archive multiple notifications |
| `restoreBusinessNotifications` | Restore multiple notifications |
| `cancelPendingNotifications` | Cancel multiple notifications |
| `retryFailedNotifications` | Retry multiple failed |
| `markAllDelivered` | Mark multiple as delivered |
| `cleanupArchivedNotifications` | Delete old archived notifications |

### Search Integration

| Method | Purpose |
|--------|---------|
| `refreshNotificationSearch` | Re-index all business notifications |
| `refreshNotificationStatistics` | Sync notification statistics to business |

### Utility

| Method | Purpose |
|--------|---------|
| `calculateNotificationCosts` | Estimate notification costs |
| `estimateNotificationVolume` | Estimate notification volume |

---

## Cascade Rules

```
Business archived
    │
    └── cascadeArchive()
        ├── for each notification: notification.service.archive()
        └── emit BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ARCHIVED

Business restored
    │
    └── cascadeRestore()
        ├── for each archived notification: notification.service.restore()
        └── emit BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_RESTORED

Business deleted
    │
    └── cascadeDelete()
        ├── for each non-archived notification: notification.service.archive()
        └── emit BUSINESS_NOTIFICATION_EVENTS.NOTIFICATION_ARCHIVED
        │
        └── NOTE: Never delete notification records (history preserved)
```

---

## Events

All events in `BUSINESS_NOTIFICATION_EVENTS` (defined in `business.events.js`):

| Event | Emitted When |
|-------|-------------|
| `business.notification:created` | Notification created |
| `business.notification:updated` | Notification updated |
| `business.notification:scheduled` | Notification scheduled |
| `business.notification:sent` | Notification sent |
| `business.notification:delivered` | Notification delivered |
| `business.notification:failed` | Notification failed |
| `business.notification:cancelled` | Notification cancelled |
| `business.notification:retried` | Notification retried |
| `business.notification:archived` | Notification archived |
| `business.notification:restored` | Notification restored |
| `business.notification:deleted` | Notification deleted |
| `business.notification:summary_updated` | Statistics synced |
| `business.notification:search_updated` | Search index refreshed |
| `business.notification:error` | Notification operation error |

---

## Search Fields

Added to `business.search.js`:

| Field | Type | Purpose |
|-------|------|---------|
| `notification_count` | number | Total business notifications |
| `pending_notifications` | number | Pending notifications count |
| `failed_notifications` | number | Failed notifications count |
| `delivery_rate` | number | Delivery success rate |
| `notification_channel` | string/null | Most used channel |
| `last_notification` | string/null | Last notification timestamp |
| `last_delivery` | string/null | Last delivery timestamp |

---

## Dependency Graph

```
BusinessManager
    │
    ├── BusinessAccommodationManager
    ├── BusinessAvailabilityManager
    ├── BusinessReservationManager
    ├── BusinessVisitorManager
    ├── BusinessPaymentManager
    ├── BusinessNotificationManager ◄── THIS FILE
    ├── BusinessBrandManager
    ├── BusinessOwnerManager
    ├── BusinessSearchManager
    ├── BusinessStatisticsManager
    └── BusinessCmsManager

BusinessNotificationManager
    │
    ├──► context.capabilities.get('notification').service    (no direct imports)
    ├──► context.capabilities.get('notification').manager   (delegation)
    ├──► BusinessReservationManager                          (reservation lookup)
    ├──► BusinessVisitorManager                              (visitor lookup)
    ├──► context.repositories.business                       (business lookup + stats sync)
    ├──► context.eventBus                                   (events)
    └──► context.runtime.search                             (re-index)
```

---

## Validation Checklist

- [x] ZERO imports from `capabilities/notification/*`
- [x] All notification logic delegated to Notification capability
- [x] Orchestration only — no notification workflow/validation/calculations duplication
- [x] ZERO infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT, HTTP, SQL, ORM)
- [x] Business-level aggregation across all notifications
- [x] Reservation coordination (create/cancel/schedule notifications for reservation)
- [x] Payment coordination (create notifications for payments)
- [x] Visitor coordination (notifications for visitors)
- [x] Business rules: cascade archive, restore, delete (preserve history)
- [x] Batch operations (archive/restore/cancel/retry many)
- [x] Notification statistics sync to business search/index
- [x] 14 BUSINESS_NOTIFICATION_EVENTS
- [x] 7 notification search fields
- [x] Wired into BusinessManager (archive/restore/delete cascade) and BusinessService
- [x] BusinessManager remains thin orchestrator (delegates all notification operations)
- [x] Backward compatibility preserved (no existing public API changed)
