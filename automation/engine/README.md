# Automation Engine

Event-driven automation rule engine for Valdi Engine. Listens to events, evaluates conditions, and executes actions automatically.

## Architecture

```
automation/engine/
├── automation.schema.js       # Rule, RuleExecution schemas
├── automation.events.js       # 14 automation events
├── automation.engine.js       # Core rule engine
├── rule.context.js            # Execution context (event data, variables, services)
├── actions/
│   ├── webhook.action.js      # HTTP webhook calls
│   ├── notification.action.js # Notification sending via templates
│   ├── log.action.js          # Debug/audit logging
│   └── service.action.js      # Business service method calls
├── rules/
│   └── predefined.rules.js    # 4 predefined rules (booking, payment, subscription)
└── README.md
```

## Usage

```js
import { AutomationEngine } from './automation/engine/automation.engine.js'

const engine = new AutomationEngine(eventBus, services)

// Register custom rule
engine.register({
  id: 'my_rule',
  tenantId: 'tenant_123',
  name: 'Send welcome on signup',
  status: 'active',
  trigger: { type: 'event', eventName: 'customer:created' },
  conditions: [{ field: 'customer.email', operator: 'is_not_empty' }],
  actions: [
    { type: 'notification', config: { templateId: 'welcome_customer', recipient: '$customer.email' } },
  ],
})

// Manually trigger
await engine.trigger('my_rule', { customer: { email: 'test@test.com' } })

// Get stats
const stats = engine.getStats('tenant_123')
```

## Predefined Rules

| Rule | Trigger | Action |
|------|---------|--------|
| Booking Confirmed | booking:confirmed | Send confirmation email |
| Payment Received | billing:payment_completed | Send payment confirmation |
| Booking Cancelled | booking:cancelled | Send cancellation email |
| Subscription Expiring | Daily 9 AM | Send expiry alert (≤7 days) |

## Action Types

| Type | Purpose |
|------|---------|
| webhook | HTTP POST to external URL |
| notification | Send via notification template |
| email | Alias for notification |
| call_service | Call a business service method |
| set_variable | Set context variable |
| log | Debug/audit logging |

## Condition Operators

equals, not_equals, gt, gte, lt, lte, contains, in, is_empty, is_not_empty

## Design Principles

- **Event-driven**: Rules triggered by EventBus events
- **Cooldown**: Prevents rule spam with configurable cooldown periods
- **Max executions**: Limits total rule executions
- **Condition filtering**: Only executes when conditions are met
- **Action pipeline**: Sequential action execution with success/failure tracking
- **Business-agnostic**: No knowledge of tourism, restaurants, etc.
