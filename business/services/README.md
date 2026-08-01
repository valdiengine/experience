# Business Services

Thin orchestration layer that sits between capabilities and UI/workflows. Provides a unified API for business domain operations.

## Architecture

```
business/services/
├── index.js                 # BusinessServices orchestrator
├── reservation.service.js   # Reservation creation, confirmation, cancellation
├── payment.service.js       # Invoice creation, payment processing, refunds
├── notification.service.js  # Notification sending, templates, scheduling
├── user.service.js          # User registration, tenant management, subscriptions
├── analytics.service.js     # Metrics, health, conversion, engagement reports
└── README.md
```

## Design Principles

- **Thin wrappers**: Each service delegates to the appropriate capability
- **Cross-capability coordination**: Services orchestrate multiple capabilities (e.g., reservation + availability + notifications)
- **Business-agnostic**: No knowledge of tourism, restaurants, drones, etc.
- **No direct data access**: All data operations go through capabilities
- **Consumed by UI/workflows**: The public API for engines and workflow nodes

## Usage

```js
import { BusinessServices } from './business/services/index.js'

// Initialize with capabilities from context
const services = new BusinessServices(context.capabilities)

// Create reservation (orchestrates reservation + availability + notifications)
const reservation = await services.reservation.create({
  tenantId: 'tenant_123',
  resource: 'room_101',
  date: '2026-02-15',
  customer: { name: 'John', email: 'john@test.com' },
})

// Process payment
const payment = await services.payment.processPayment({
  tenantId: 'tenant_123',
  invoiceId: 'inv_123',
  amount: 150000,
  method: 'credit_card',
})

// Send notification from template
await services.notification.sendFromTemplate({
  tenantId: 'tenant_123',
  templateId: 'reservation_confirmation',
  recipient: 'john@test.com',
  variables: { customer_name: 'John', reservation_id: '123' },
})

// Get analytics
const report = services.analytics.getFullReport('tenant_123')
```

## Cross-Capability Orchestration

The key value of business services is coordinating multiple capabilities:

- **Reservation Service**: reservation + availability + notifications
- **Payment Service**: billing
- **Notification Service**: notifications (templates, scheduling, analytics)
- **User Service**: onboarding + admin + saas
- **Analytics Service**: observability + conversion + engagement + intelligence + notifications + billing + lifecycle
