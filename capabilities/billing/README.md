# Billing Capability

**Version:** 1.0.0
**Status:** Stable
**Dependencies:** saas

## Purpose

Billing & Payment Infrastructure Layer — connects SaaS subscriptions with future payment providers through a provider-independent abstraction.

## Architecture

```
billing.capability.js
├── InvoiceManager        → Create, track, update invoices
├── PaymentManager        → Payment lifecycle management
├── TransactionManager    → Central transaction history
├── ProviderManager       → Payment provider abstraction
└── SubscriptionBilling   → Connect billing with SaaS subscriptions
```

## Flow

```
Customer selects plan
  ↓
Subscription created (SaaS)
  ↓
Invoice generated (InvoiceManager)
  ↓
Payment created (PaymentManager)
  ↓
Provider processes (ProviderManager)
  ↓
Payment result
  ↓
Subscription updated (SubscriptionBilling → SaaS)
  ↓
Entitlements updated (SaaS → EntitlementManager)
```

## Payment Provider Abstraction

```javascript
// Register a provider
billing.registerProvider(StripeProvider)

// Set active
billing.setActiveProvider('stripe')

// All operations go through active provider
billing.createPayment(invoice, 'stripe')
```

## Provider Interface

```javascript
class PaymentProvider {
  static id = 'provider_id'
  static name = 'Provider Name'

  async initialize(config) {}
  async createPayment(data) {}
  async checkStatus(externalId) {}
  async cancelPayment(externalId) {}
  async refundPayment(externalId, amount) {}
}
```

## Default Provider

MockProvider — for testing only. Returns success for all operations.

## Usage

```javascript
const billing = context.capabilities.get('billing')

// Create invoice
const invoice = billing.createInvoice({
  tenantId: 'tenant_123',
  subscriptionId: 'sub_123',
  planId: 'magnum_saas',
  amount: 50000,
  currency: 'CLP',
})

// Process payment
const payment = billing.createPayment(invoice.invoice, 'mock')

// Handle success
await billing.handlePaymentSuccess(payment.payment.id)

// Check status
const status = billing.getBillingStatus('tenant_123')
// { subscription, totalInvoices, pendingInvoices, paidInvoices, ... }

// Transaction report
const report = billing.getTransactionReport('tenant_123')
// { totalTransactions, totalAmount, byType, byStatus }
```

## Events

| Event | Description |
|-------|-------------|
| `billing:invoice_created` | Invoice created |
| `billing:invoice_paid` | Invoice marked as paid |
| `billing:invoice_failed` | Invoice marked as failed |
| `billing:payment_created` | Payment created |
| `billing:payment_completed` | Payment completed |
| `billing:payment_failed` | Payment failed |
| `billing:subscription_activated` | Subscription activated via payment |
| `billing:subscription_suspended` | Subscription suspended via payment failure |
| `billing:refund_created` | Refund created |

## Configuration

```javascript
{
  defaultCurrency: 'CLP',
  billingPeriods: ['monthly', 'yearly'],
  gracePeriodDays: 3,
  retryPolicy: { maxAttempts: 3, delayMs: 5000, backoffMultiplier: 2 },
}
```
