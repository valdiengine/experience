# Business Payment Manager

> P13.6.1 — Orchestration layer for business-owned payment lifecycle management.
> Pure orchestration. All payment logic delegated to Payment capability.

---

## Purpose

Bridge the Business capability (aggregate root) with the Payment capability (financial domain). Provides business-level aggregation, payment analytics, reservation coordination, visitor coordination, batch operations, cascade rules, and search sync — while delegating all lifecycle, workflow, validation, permissions, calculations, and refund logic to the Payment capability.

Business owns the **financial relationship** with payments. Payment remains responsible for payment business logic.

---

## Architecture Rule

**BusinessPaymentManager MUST NOT import anything from `capabilities/payment/`.**

All communication with the Payment domain uses:
- `context.capabilities.get('payment').service` — public service methods
- `context.capabilities.get('payment').manager` — manager methods (when service delegation is insufficient)
- `context.repositories.business` — business lookup + statistics sync
- `context.repositories.reservation` — reservation lookup (via BusinessReservationManager)
- `context.eventBus` — business payment events
- `context.runtime.search` — search indexing

---

## Aggregate Boundaries

```
Payment capability (pure domain)
    - payment.status / payment.workflow        → owns state transitions
    - payment.validation                       → owns validation rules
    - payment.calculation                      → owns calculations
    - payment.refund                           → owns refund logic
    - payment.fees                            → owns fee calculations
    - payment.permissions                      → 10 payment permissions
    - payment.manager                         → all lifecycle logic
    - payment.events                          → 17 payment events

BusinessPaymentManager (orchestration only)
    - business ownership checks
    - business↔payment relationship (payments belong to business)
    - business-level aggregation, analytics, batch, export, cascade
    - reservation coordination (creates payments for reservations)
    - visitor coordination (tracks payments by visitor)
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
BusinessPaymentManager
    │
    ├──► context.capabilities.get('payment').service.create()
    ├──► context.capabilities.get('payment').service.update()
    ├──► context.capabilities.get('payment').service.authorize()
    ├──► context.capabilities.get('payment').service.capture()
    ├──► context.capabilities.get('payment').service.markPaid()
    ├──► context.capabilities.get('payment').service.cancel()
    ├──► context.capabilities.get('payment').service.expire()
    ├──► context.capabilities.get('payment').service.refund()
    ├──► context.capabilities.get('payment').service.partialRefund()
    ├──► context.capabilities.get('payment').service.archive()
    ├──► context.capabilities.get('payment').service.restore()
    ├──► context.capabilities.get('payment').service.delete()
    ├──► context.capabilities.get('payment').service.findByReservation()
    ├──► context.capabilities.get('payment').service.findByBusiness()
    ├──► context.capabilities.get('payment').service.findByVisitor()
    ├──► context.capabilities.get('payment').service.findPending()
    ├──► context.capabilities.get('payment').service.findPaid()
    ├──► context.capabilities.get('payment').service.findFailed()
    ├──► context.capabilities.get('payment').service.findRefunded()
    ├──► context.capabilities.get('payment').service.calculateFees()
    ├──► context.capabilities.get('payment').service.getRefundEligibility()
    ├──► context.repositories.business                      (statistics sync)
    └──► BusinessReservationManager                         (reservation lookup)
```

---

## Method Catalog

### Payment Lifecycle

| Method | Delegates To | Purpose |
|--------|-------------|---------|
| `createPayment` | `payment.service.create` | Create a new payment for business |
| `updatePayment` | `payment.service.update` | Update payment fields |
| `authorizePayment` | `payment.service.authorize` | Authorize payment |
| `capturePayment` | `payment.service.capture` | Capture authorized payment |
| `markPaid` | `payment.service.markPaid` | Mark payment as paid |
| `cancelPayment` | `payment.service.cancel` | Cancel a payment |
| `expirePayment` | `payment.service.expire` | Expire a payment |
| `refundPayment` | `payment.service.refund` | Refund a payment |
| `partialRefundPayment` | `payment.service.partialRefund` | Partial refund |
| `archivePayment` | `payment.service.archive` | Archive a payment |
| `restorePayment` | `payment.service.restore` | Restore an archived payment |
| `deletePayment` | `payment.service.delete` | Delete a payment |

### Payment Queries

| Method | Purpose |
|--------|---------|
| `findPayment` | Get by ID with business ownership check |
| `findPayments` | Filter by status/method/reservation/visitor |
| `findPaymentByReservation` | Find payments for a reservation |
| `findPaymentsByVisitor` | Find payments for a visitor |
| `findPendingPayments` | Find pending payments |
| `findPaidPayments` | Find paid payments |
| `findFailedPayments` | Find failed payments |
| `findRefundedPayments` | Find refunded payments |
| `findExpiredPayments` | Find expired payments |
| `getPayment` | Alias for findPayment |
| `getBusinessPayments` | All payments for the business |
| `paymentExists` | Boolean existence check |
| `countPayments` | Total business payments |

### Business Aggregation

| Method | Purpose |
|--------|---------|
| `getBusinessRevenue` | Total revenue, refunded, net revenue |
| `getBusinessOutstandingPayments` | Outstanding payment count and total |
| `getBusinessRefunds` | Total refunds count and amount |
| `getBusinessCommissions` | Total commissions |
| `getBusinessPaymentStatistics` | Payment statistics by status |
| `getBusinessPaymentSummary` | Complete payment summary |
| `getBusinessCashFlow` | Cash flow for a period |
| `getBusinessRevenueByPeriod` | Revenue breakdown by daily/monthly/yearly |
| `getBusinessPaymentDashboard` | Dashboard with summary and recent payments |

### Reservation Coordination

| Method | Purpose |
|--------|---------|
| `createReservationPayment` | Create payment linked to reservation |
| `cancelReservationPayment` | Cancel all payments for a reservation |
| `expireReservationPayment` | Expire pending payments for a reservation |
| `refundReservationPayment` | Refund payment for a reservation |
| `findReservationPayment` | Find payment by reservation |

### Visitor Coordination

| Method | Purpose |
|--------|---------|
| `getVisitorPayments` | All payments for a visitor |
| `getVisitorOutstandingBalance` | Outstanding balance for visitor |
| `getVisitorPaymentHistory` | Full payment history for visitor |
| `refundVisitorPayments` | Bulk refund payments for visitor |

### Batch Operations

| Method | Purpose |
|--------|---------|
| `archiveBusinessPayments` | Archive multiple payments |
| `restoreBusinessPayments` | Restore multiple archived payments |
| `cancelPendingPayments` | Cancel multiple pending payments |
| `expirePendingPayments` | Expire multiple pending payments |
| `bulkRefundPayments` | Bulk refund with amounts array |
| `cancelAllPendingPayments` | Cancel all pending payments |
| `expireAllPendingPayments` | Expire all pending payments |

### Search Integration

| Method | Purpose |
|--------|---------|
| `refreshPaymentSearch` | Re-index all business payments to search engine |
| `refreshPaymentStatistics` | Compute and sync payment statistics to business |

### Business Rules (Cascade)

| Method | Trigger | Action |
|--------|---------|--------|
| `cascadeArchive` | Business archived | Archive all non-archived payments |
| `cascadeRestore` | Business restored | Restore payments archived by the business |
| `cascadeDelete` | Business deleted | Archive all non-archived payments (never delete financial history) |

---

## Reservation Coordination Flow

```
createReservationPayment
    │
    ├── validate business active
    ├── assert reservation belongs to business (via BusinessReservationManager)
    ├── build payment data with reservationId + visitorId from reservation
    ├── delegate payment.service.create(paymentData)
    └── emit BusinessPaymentCreated

cancelReservationPayment
    │
    ├── validate business active + ownership
    ├── find all payments for reservation
    ├── filter cancellable (not cancelled/refunded/expired/archived)
    ├── for each: delegate payment.service.cancel()
    └── emit BusinessPaymentCancelled

refundReservationPayment
    │
    ├── validate business active + ownership
    ├── find all payments for reservation
    ├── filter refundable (paid/partially_refunded)
    ├── delegate payment.service.refund() on first refundable
    └── emit BusinessPaymentRefunded
```

---

## Visitor Coordination Flow

```
getVisitorPayments
    │
    ├── validate visitor belongs to business (via BusinessVisitorManager pattern)
    ├── delegate payment.service.findByVisitor(visitorId)
    └── filter by businessId

getVisitorOutstandingBalance
    │
    ├── get all visitor payments
    ├── filter outstanding (pending/authorized/partially_paid)
    └── sum remainingAmount

refundVisitorPayments
    │
    ├── validate business active + ownership
    ├── filter payments by provided IDs
    ├── filter refundable (paid/partially_refunded)
    ├── distribute amount evenly across refundable payments
    └── emit BusinessPaymentRefunded
```

---

## Cascade Rules

```
Business archived
    │
    └── cascadeArchive()
        ├── for each payment: payment.service.archive()
        └── emit BUSINESS_PAYMENT_EVENTS.PAYMENT_ARCHIVED

Business restored
    │
    └── cascadeRestore()
        ├── for each archived payment: payment.service.restore()
        └── emit BUSINESS_PAYMENT_EVENTS.PAYMENT_RESTORED

Business deleted
    │
    └── cascadeDelete()
        ├── for each non-archived payment: payment.service.archive()
        └── emit BUSINESS_PAYMENT_EVENTS.PAYMENT_ARCHIVED
        │
        └── NOTE: Never delete payment records (financial history preserved)
```

---

## Events

All events in `BUSINESS_PAYMENT_EVENTS` (defined in `business.events.js`):

| Event | Emitted When |
|-------|-------------|
| `business.payment:created` | Payment created for this business |
| `business.payment:updated` | Payment updated |
| `business.payment:authorized` | Payment authorized |
| `business.payment:captured` | Payment captured |
| `business.payment:paid` | Payment marked as paid |
| `business.payment:cancelled` | Payment cancelled |
| `business.payment:expired` | Payment expired |
| `business.payment:failed` | Payment failed |
| `business.payment:refunded` | Payment refunded |
| `business.payment:partially_refunded` | Payment partially refunded |
| `business.payment:archived` | Payment archived |
| `business.payment:restored` | Payment restored |
| `business.payment:deleted` | Payment deleted |
| `business.payment:summary_updated` | Business payment statistics synced |
| `business.payment:search_updated` | Payment search index refreshed |
| `business.payment:error` | Payment operation error |

---

## Search Fields

Added to `business.search.js`:

| Field | Type | Purpose |
|-------|------|---------|
| `payment_count` | number | Total business payments |
| `payment_total` | number | Total payment volume |
| `payment_pending` | number | Pending payments count |
| `payment_paid` | number | Paid payments count |
| `payment_failed` | number | Failed payments count |
| `payment_refunded` | number | Refunded payments count |
| `payment_outstanding` | number | Outstanding payments total |
| `payment_revenue` | number | Net payment revenue |
| `payment_commission` | number | Total commissions |
| `payment_currency` | string/null | Business currency |
| `last_payment_sync` | string/null | Last payment sync timestamp |

---

## Dependency Graph

```
BusinessManager
    │
    ├── BusinessAccommodationManager
    ├── BusinessAvailabilityManager
    ├── BusinessReservationManager
    ├── BusinessVisitorManager
    ├── BusinessPaymentManager ◄── THIS FILE
    ├── BusinessBrandManager
    ├── BusinessOwnerManager
    ├── BusinessSearchManager
    ├── BusinessStatisticsManager
    └── BusinessCmsManager

BusinessPaymentManager
    │
    ├──► context.capabilities.get('payment').service    (no direct imports)
    ├──► context.capabilities.get('payment').manager   (delegation)
    ├──► BusinessReservationManager                      (reservation lookup)
    ├──► context.repositories.business                   (business lookup + stats sync)
    ├──► context.eventBus                               (events)
    └──► context.runtime.search                         (re-index)
```

---

## Validation Checklist

- [x] ZERO imports from `capabilities/payment/*`
- [x] All payment logic delegated to Payment capability
- [x] Orchestration only — no payment workflow/validation/calculations duplication
- [x] ZERO infrastructure imports (PostgreSQL, Drizzle, WordPress, JWT, HTTP, SQL, ORM)
- [x] Business-level aggregation across all payments
- [x] Reservation coordination (create/cancel/expire/refund payments for reservation)
- [x] Visitor coordination (payments by visitor, outstanding balance, history)
- [x] Business rules: cascade archive, restore, delete (preserve financial history)
- [x] Batch operations (archive/restore/cancel/expire/refund many)
- [x] Payment statistics sync to business search/index
- [x] Payment analytics (revenue, cash flow, commissions, dashboard)
- [x] 17 BUSINESS_PAYMENT_EVENTS
- [x] 11 payment search fields
- [x] Wired into BusinessManager (archive/restore/delete cascade) and BusinessService
- [x] BusinessManager remains a thin orchestrator (delegates all payment operations)
- [x] Backward compatibility preserved (no existing public API changed)
