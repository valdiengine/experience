# Payment Capability — Architecture Document

## 1. Overview

Payment is a Business Capability that manages commercial payment transactions for the Valdi Engine platform. It provides a complete payment lifecycle: creation, authorization, capture, settlement, refunds, disputes, and archival.

**Key Principle:** Payment is a pure commercial domain capability. It knows nothing about payment gateways, processors, or acquiring banks. These integrations happen at the infrastructure layer via providers.

## 2. Aggregate Ownership

```
Business (Aggregate Root)
  └── Payment (owned entity)
        └── Reservation (optional reference)
              └── Visitor (optional reference)

Visitor ──not─owns── Payment
Payment ──not─owns── Reservation
Payment ──not─owns── Business
```

**Rules:**
- Payment MUST belong to a Business
- Payment MAY reference a Reservation (optional)
- Payment MAY reference a Visitor (optional)
- Payment NEVER owns Reservation
- Payment NEVER owns Business
- Payment NEVER owns Visitor
- Visitor NEVER owns Payments

## 3. Capability Structure

```
PaymentCapability (BaseCapability)
  ├── PaymentService (public API facade)
  │     └── PaymentManager (orchestrator)
  │           ├── PaymentWorkflow (state machine)
  │           ├── PaymentValidation (input validation)
  │           ├── PaymentCalculation (amount calculations)
  │           ├── PaymentFees (fee management)
  │           ├── PaymentRefund (refund engine)
  │           └── PaymentSearch (search indexing)
  │
  ├── context.repositories.payment (persistence)
  ├── context.runtime.auth (authorization)
  ├── context.runtime.search (search)
  └── context.eventBus (events)
```

## 4. Status Lifecycle

### 4.1 Payment Statuses

| Status | Description |
|--------|-------------|
| `draft` | Initial status, payment created but not initiated |
| `pending` | Payment initiated, awaiting processing |
| `processing` | Payment being processed by payment provider |
| `authorized` | Payment authorized, awaiting capture |
| `partially_paid` | Partial payment received |
| `paid` | Fully paid |
| `failed` | Payment failed |
| `cancelled` | Payment cancelled |
| `expired` | Payment authorization expired |
| `partially_refunded` | Partial refund issued |
| `refunded` | Fully refunded |
| `disputed` | Payment under dispute |
| `chargeback` | Chargeback received |
| `archived` | Archived |

### 4.2 Valid Transitions

```
DRAFT:
  → PENDING
  → CANCELLED
  → ARCHIVED

PENDING:
  → PROCESSING
  → CANCELLED
  → EXPIRED
  → ARCHIVED

PROCESSING:
  → AUTHORIZED
  → PAID
  → PARTIALLY_PAID
  → FAILED
  → CANCELLED

AUTHORIZED:
  → PAID
  → PARTIALLY_PAID
  → CANCELLED
  → REFUNDED
  → EXPIRED

PARTIALLY_PAID:
  → PAID
  → REFUNDED
  → PARTIALLY_REFUNDED
  → CHARGEBACK
  → DISPUTED

PAID:
  → REFUNDED
  → PARTIALLY_REFUNDED
  → CHARGEBACK
  → DISPUTED
  → ARCHIVED

FAILED:
  → PENDING
  → CANCELLED
  → ARCHIVED

CANCELLED:
  → ARCHIVED

EXPIRED:
  → PENDING
  → ARCHIVED

PARTIALLY_REFUNDED:
  → REFUNDED
  → PAID
  → CHARGEBACK
  → DISPUTED

REFUNDED:
  → ARCHIVED

DISPUTED:
  → PAID
  → REFUNDED
  → CHARGEBACK

CHARGEBACK:
  → ARCHIVED

ARCHIVED:
  (terminal)
```

## 5. Payment Schema

### 5.1 Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | auto | Unique identifier |
| `tenantId` | string | yes | Tenant isolation |
| `destinationId` | string | no | Destination context |
| `businessId` | string | yes | Owner business |
| `reservationId` | string | no | Associated reservation |
| `visitorId` | string | no | Associated visitor |
| `currency` | string | yes | ISO 4217 currency code |
| `subtotal` | number | yes | Base amount |
| `discount` | number | no | Discount amount |
| `taxes` | number | no | Tax amount |
| `fees` | number | no | Fee amount |
| `commission` | number | no | Platform commission |
| `total` | number | yes | Final total amount |
| `paidAmount` | number | no | Amount paid |
| `remainingAmount` | number | no | Amount remaining |
| `refundedAmount` | number | no | Amount refunded |
| `status` | string | yes | Current status |
| `method` | string | no | Payment method |
| `provider` | string | no | Provider name |
| `reference` | string | no | External reference |
| `transactionId` | string | no | Provider transaction ID |
| `metadata` | object | no | Extensible metadata |
| `createdBy` | string | no | Creator identity |
| `updatedBy` | string | no | Last updater identity |
| `createdAt` | string | auto | Creation timestamp |
| `updatedAt` | string | auto | Update timestamp |
| `paidAt` | string | no | Payment timestamp |
| `expiredAt` | string | no | Expiration timestamp |
| `previousStatus` | string | no | Previous status |

### 5.2 Payment Methods

Generic methods (no provider-specific names):

| Method | Description |
|--------|-------------|
| `credit_card` | Credit card payment |
| `debit_card` | Debit card payment |
| `cash` | Cash payment |
| `bank_transfer` | Bank transfer |
| `wallet` | Digital wallet |
| `voucher` | Voucher or gift card |
| `manual` | Manual payment |
| `other` | Other method |

**Note:** Providers (Stripe, MercadoPago, Transbank) will map these to their specific payment method types.

## 6. State Machine

### 6.1 PaymentWorkflow Class

```javascript
static canTransition(from, to) { ... }
static transition(payment, newStatus) { ... }
static getValidTransitions(currentStatus) { ... }
static getAllStatuses() { ... }
static isTerminal(status) { ... }
static isRefundable(payment) { ... }
static isCancellable(payment) { ... }
static getRefundableAmount(payment) { ... }
```

### 6.2 State Transition Rules

- Every transition MUST be explicit via `PaymentWorkflow.transition()`
- Invalid transitions throw `PaymentStateError`
- Transitions record `previousStatus` for restore functionality
- Terminal statuses have no valid transitions

## 7. Repository Contract

Payment uses `context.repositories.payment` for persistence.

### 7.1 Required Methods

```javascript
repo.findById(id)
repo.findOne(filter)
repo.findMany(filter)
repo.create(payment)
repo.update(filter, changes)
repo.delete(filter)
repo.count(filter)
repo.exists(filter)
repo.paginate(filter, options)
```

### 7.2 Query Patterns

```javascript
findByReservation(reservationId)
findByBusiness(businessId)
findByVisitor(visitorId)
findPending()
findPaid()
findFailed()
findRefunded()
```

## 8. Event Model

### 8.1 Events Emitted

| Event | Trigger |
|-------|---------|
| `payment:created` | New payment created |
| `payment:updated` | Payment data updated |
| `payment:authorized` | Payment authorized |
| `payment:captured` | Payment captured |
| `payment:paid` | Full payment received |
| `payment:failed` | Payment failed |
| `payment:cancelled` | Payment cancelled |
| `payment:expired` | Payment expired |
| `payment:refunded` | Full refund issued |
| `payment:partially_refunded` | Partial refund issued |
| `payment:disputed` | Dispute opened |
| `payment:chargeback` | Chargeback received |
| `payment:archived` | Payment archived |
| `payment:restored` | Payment restored |
| `payment:deleted` | Payment deleted |

### 8.2 Event Payload Structure

```javascript
{
  payment: { /* full payment object */ },
  identity: { /* actor identity */ },
  changes: { /* for updates */ },
  refund: { /* for refunds */ }
}
```

## 9. Search Model

### 9.1 Search Payload

```javascript
{
  id, tenantId, destinationId, businessId, reservationId, visitorId,
  currency, subtotal, discount, taxes, fees, commission, total,
  paidAmount, remainingAmount, refundedAmount,
  status, statusLabel, method, provider, reference, transactionId,
  paymentDate, refundStatus, createdAt, updatedAt
}
```

### 9.2 Filterable Fields

- `equals`: id, tenantId, businessId, reservationId, visitorId, status, currency, method
- `range`: total, paidAmount, remainingAmount, refundedAmount, createdAt, paidAt
- `contains`: reference, transactionId

## 10. Validation

### 10.1 Validation Rules

1. **Amount validation**: All amounts must be non-negative numbers
2. **Currency validation**: Must be valid 3-letter ISO code
3. **Payment method validation**: Must be from allowed list
4. **Refund validation**: Cannot exceed paidAmount - refundedAmount
5. **Business ownership**: Payment must have businessId
6. **State transitions**: Must follow valid transition rules

### 10.2 Validation Error Hierarchy

```
PaymentError
  ├── PaymentValidationError
  ├── PaymentNotFoundError
  ├── PaymentAlreadyPaidError
  ├── PaymentAlreadyRefundedError
  ├── PaymentStateError
  ├── PaymentPermissionError
  ├── PaymentAmountError
  ├── PaymentExpiredError
  ├── PaymentConflictError
  └── PaymentRefundError
```

## 11. Refund Engine

### 11.1 RefundEligibility

```javascript
{
  eligible: boolean,
  reason: string | null,
  maxRefundable: number,
  paidAmount: number,
  refundedAmount: number
}
```

### 11.2 Refund Breakdown

```javascript
{
  refundAmount: number,
  refundSubtotal: number,
  refundTaxes: number,
  refundFees: number,
  originalTotal: number,
  newPaidAmount: number,
  newRefundedAmount: number
}
```

### 11.3 Refund Rules

- Full refund: refundAmount = maxRefundable
- Partial refund: any amount up to maxRefundable
- Refund ratio applied proportionally to subtotal, taxes, fees
- Refund history maintained in payment.refundHistory

## 12. Fee Engine

### 12.1 Fee Types

| Type | Calculation |
|------|-------------|
| `platformCommission` | subtotal × commissionRate |
| `cleaningFee` | flat/per_night/per_guest/percentage |
| `serviceFee` | flat/percentage/tiered |
| `tax` | taxableAmount × taxRate |
| `discount` | percentage/fixed/coupon |
| `adjustment` | manual positive/negative adjustment |

### 12.2 Fee Calculation

```javascript
calculateAllFees(subtotal, options) → {
  breakdown: {
    subtotal, platformCommission, cleaningFee,
    serviceFee, taxes, discount, couponDiscount, adjustments
  },
  total: number,
  totalDiscounts: number
}
```

## 13. Extension Points

### 13.1 Future Provider Integration

Payment capability is provider-agnostic. Future integrations:

```javascript
// Provider maps generic → specific
StripeProvider:
  credit_card → Stripe.paymentMethods.type = 'card'
  bank_transfer → Stripe.paymentIntents.method = 'bank_transfer'

MercadoPagoProvider:
  credit_card → MercadoPago.payment.method = 'credit_card'
  wallet → MercadoPago.payment.wallet
```

### 13.2 Hooks for Future Features

- Custom fee calculation rules per business
- Custom tax rules per destination
- Coupon and discount systems
- Multi-currency with conversion
- Payment method routing based on amount/country
- Fraud detection integration
- Dispute management workflow

## 14. Architecture Rules

| Rule | Description |
|------|-------------|
| PAY-001 | Payment MUST NOT import any payment gateway SDK |
| PAY-002 | Payment MUST NOT contain SQL or database queries |
| PAY-003 | Payment MUST NOT know about Stripe, MercadoPago, Transbank |
| PAY-004 | Payment MUST use context.repositories.payment for persistence |
| PAY-005 | Payment MUST use context.runtime.auth for authorization |
| PAY-006 | Payment MUST use context.eventBus for events |
| PAY-007 | All status transitions MUST go through PaymentWorkflow |
| PAY-008 | Payment MUST validate all amounts before computation |
| PAY-009 | Payment MUST track refund history |
| PAY-010 | Visitor NEVER owns Payments |

## 15. Dependencies

```
Payment
  └── (no capability dependencies)

Context requires:
  ├── repositories.payment
  ├── runtime.auth
  ├── runtime.search
  └── eventBus
```

## 16. Future Considerations

- Split payment into multiple transactions
- Recurring payments / subscriptions
- Escrow / hold functionality
- Payment method tokenization
- Multi-currency support
- FX conversion
- Refundreason codes
- Dispute resolution workflow
