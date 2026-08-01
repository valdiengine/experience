# Payment Capability

## Overview

Payment is a Business Capability that manages commercial payment transactions for the Valdi Engine platform.

Manages the complete lifecycle of payments: creation, authorization, capture, settlement, refunds, disputes, and archival.

## Architecture

```
PaymentCapability (BaseCapability)
  │
  ├── PaymentService (public API)
  │     └── PaymentManager (orchestrator)
  │           ├── repositories.payment (persistence)
  │           ├── runtime.auth (authorization)
  │           ├── runtime.search (search payload)
  │           └── eventBus (events)
  │
  ├── PaymentWorkflow (state machine)
  ├── PaymentValidation (input validation)
  ├── PaymentCalculation (amount calculations)
  ├── PaymentFees (fee management)
  ├── PaymentRefund (refund engine)
  ├── PaymentSearch (search payload)
  └── PaymentPermissions (permissions)
```

## Status Lifecycle

```
DRAFT ──→ PENDING ──→ PROCESSING ──→ AUTHORIZED ──→ PAID ──→ REFUNDED
  │         │              │            │         ├─→ PARTIALLY_REFUNDED
  │         │              │            │         ├─→ DISPUTED
  │         │              │            │         └─→ CHARGEBACK
  │         │              │            └─→ EXPIRED
  │         │              └─→ FAILED
  │         └─→ EXPIRED
  └─→ CANCELLED ──→ ARCHIVED
```

## Files

| File | Responsibility |
|------|---------------|
| `payment.capability.js` | BaseCapability wrapper, event subscriptions, infra integration |
| `payment.manager.js` | Business orchestrator, workflow execution |
| `payment.service.js` | Public API delegation |
| `payment.workflow.js` | Status state machine |
| `payment.validation.js` | Input and business rule validation |
| `payment.schema.js` | Data structure definition |
| `payment.status.js` | Status constants and helpers |
| `payment.events.js` | Event constants |
| `payment.errors.js` | Error hierarchy |
| `payment.permissions.js` | Permission constants |
| `payment.calculation.js` | Amount calculations |
| `payment.fees.js` | Fee management |
| `payment.refund.js` | Refund engine |
| `payment.search.js` | Search index payload generation |

## Payment Statuses

- `draft` - Initial status, payment not initiated
- `pending` - Payment initiated, awaiting processing
- `processing` - Payment being processed
- `authorized` - Payment authorized, awaiting capture
- `partially_paid` - Partial payment received
- `paid` - Fully paid
- `failed` - Payment failed
- `cancelled` - Payment cancelled
- `expired` - Payment authorization expired
- `partially_refunded` - Partial refund issued
- `refunded` - Fully refunded
- `disputed` - Payment under dispute
- `chargeback` - Chargeback received
- `archived` - Archived

## Payment Methods

Generic payment methods (no provider-specific names):

- `credit_card` - Credit card payment
- `debit_card` - Debit card payment
- `cash` - Cash payment
- `bank_transfer` - Bank transfer
- `wallet` - Digital wallet
- `voucher` - Voucher or gift card
- `manual` - Manual payment
- `other` - Other payment method

## Permissions Required

- `payment:create`
- `payment:read`
- `payment:update`
- `payment:cancel`
- `payment:refund`
- `payment:archive`
- `payment:restore`
- `payment:delete`
- `payment:manage`

## Events Emitted

- `payment:created`
- `payment:updated`
- `payment:authorized`
- `payment:captured`
- `payment:paid`
- `payment:failed`
- `payment:cancelled`
- `payment:expired`
- `payment:refunded`
- `payment:partially_refunded`
- `payment:disputed`
- `payment:chargeback`
- `payment:archived`
- `payment:restored`
- `payment:deleted`

## Architecture Rules

- **Never** imports PostgreSQL, Drizzle, WordPress, JWT, HTTP, or Browser APIs
- **Never** knows SQL or database implementation details
- **Never** implements payment gateway logic (Stripe, MercadoPago, Transbank, etc.)
- Persistence goes through `context.repositories.payment`
- Authorization goes through `context.runtime.auth`
- Search goes through `context.runtime.search`
- Events go through `context.eventBus`

## Business Rules

- Payment is owned by Business
- Payment references Reservation (optional)
- Payment never owns Reservation
- Payment never owns Business
- Payment never owns Visitor
- Visitor never owns Payments

## Future Provider Integration

Payment methods are generic. Providers (Stripe, MercadoPago, Transbank) will map these methods:

```
credit_card → Stripe/Transbank credit card
bank_transfer → Stripe/Transbank bank transfer
wallet → MercadoPago wallet, Stripe Connect
```

## Extension Points

- Custom fee calculation rules
- Custom tax calculation rules
- Coupon and discount systems
- Multi-currency support
- Payment method routing
- Fraud detection hooks
