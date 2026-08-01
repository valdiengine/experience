# Notifications Capability (v2.0.0)

Full notification engine for multi-tenant platforms: templates, preferences, scheduling, batching, rate limiting, and analytics.

## Architecture

```
notifications/
├── notification.schema.js        # Notification, Template, Preference, Schedule, Batch schemas
├── notification.events.js        # 20 lifecycle events
├── notification.manager.js       # Orchestrator for all sub-modules
├── notifications.capability.js   # v2.0.0, no dependencies
├── templates/
│   └── template.manager.js       # Template CRUD + variable interpolation
├── preferences/
│   └── notification.preferences.js # Per-user/tenant preferences + quiet hours
├── scheduler/
│   └── notification.scheduler.js # Delayed + recurring notifications
├── batching/
│   └── batch.processor.js        # Batch sending with chunked processing
├── rate-limit/
│   └── rate.limiter.js           # Per-channel, per-recipient, per-tenant limits
├── analytics/
│   └── notification.analytics.js # Delivery, open, click, failure tracking
├── providers/
│   ├── email.provider.js         # Email (SendGrid, SES)
│   ├── push.provider.js          # Push (Firebase, OneSignal)
│   ├── whatsapp.provider.js      # WhatsApp Business API
│   └── sms.provider.js           # SMS (Twilio, Vonage)
└── README.md
```

## Sub-modules

### Template Manager
```js
const templates = notifications.templates

// Create custom template
templates.create({
  id: 'custom_welcome',
  name: 'Custom Welcome',
  channel: 'email',
  category: 'onboarding',
  subject: 'Welcome to {{business_name}}',
  body: 'Hello {{customer_name}}, welcome!',
  variables: ['business_name', 'customer_name'],
})

// Render with variables
const result = templates.render('custom_welcome', {
  business_name: 'Hotel Test',
  customer_name: 'John',
})
// { success: true, rendered: { subject: 'Welcome to Hotel Test', body: 'Hello John, welcome!' } }
```

### Preferences
```js
const prefs = notifications.preferences

// Set user preference
prefs.set('tenant_123', 'email', 'marketing', { enabled: false }, 'user_456')

// Check if notification is allowed
const check = prefs.isAllowed('tenant_123', 'email', 'marketing', 'user_456')
// { allowed: false, reason: 'disabled_by_user' }

// Quiet hours
prefs.set('tenant_123', 'push', 'reservation', {
  enabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'America/Santiago',
})
```

### Scheduler
```js
const scheduler = notifications.scheduler

// Schedule one-time
scheduler.schedule({
  tenantId: 'tenant_123',
  notification: { channel: 'email', recipient: 'user@test.com' },
  scheduledAt: '2026-02-01T10:00:00Z',
})

// Schedule recurring
scheduler.scheduleRecurring({
  tenantId: 'tenant_123',
  notification: { channel: 'email', recipient: 'admin@test.com' },
  recurrenceRule: 'weekly',
})
```

### Batch Processing
```js
const batch = notifications.batchProcessor

// Create batch
const { batchId } = batch.createBatch({
  tenantId: 'tenant_123',
  channel: 'email',
  notifications: [
    { recipient: 'user1@test.com', body: 'Hello 1' },
    { recipient: 'user2@test.com', body: 'Hello 2' },
    // ... up to hundreds
  ],
  batchSize: 50,
})

// Process
await batch.processBatch(batchId)
```

### Rate Limiting
```js
const limiter = notifications.rateLimiter

// Custom limits
limiter.setLimits('email', { perMinute: 20, perHour: 200, perDay: 1000 })

// Check before sending
const check = limiter.check('email', 'user@test.com', 'tenant_123')
// { allowed: true } or { allowed: false, reason: 'recipient_per_minute_limit', retryAfterMs: 30000 }

// Get usage
const usage = limiter.getUsage('tenant_123')
```

### Analytics
```js
const analytics = notifications.analytics

// Get stats
const stats = analytics.getStats('tenant_123', 'email')
// { sent: 150, delivered: 145, opened: 80, clicked: 20, failed: 5, deliveryRate: 96.7, openRate: 55.2 }

// Get channel breakdown
const breakdown = analytics.getChannelBreakdown('tenant_123')

// Get full report
const report = analytics.getReport('tenant_123')
```

## Default Templates (8)

| ID | Channel | Category |
|----|---------|----------|
| reservation_confirmation | email | reservation |
| reservation_reminder | email | reservation |
| reservation_cancellation | email | reservation |
| welcome_customer | email | onboarding |
| payment_received | email | billing |
| subscription_expiring | email | billing |
| push_reservation_update | push | reservation |
| sms_verification | sms | auth |

## Events (20)

Core: `SENT`, `FAILED`, `QUEUED`
Delivery: `DELIVERED`, `OPENED`, `CLICKED`
Scheduling: `SCHEDULED`, `SCHEDULE_CANCELLED`, `SCHEDULE_TRIGGERED`
Batching: `BATCH_CREATED`, `BATCH_COMPLETED`, `BATCH_FAILED`
Rate limiting: `RATE_LIMITED`
Templates: `TEMPLATE_CREATED`, `TEMPLATE_UPDATED`, `TEMPLATE_DELETED`, `TEMPLATE_RENDERED`
Preferences: `PREFERENCE_UPDATED`
Retries: `RETRY_SCHEDULED`, `RETRY_EXHAUSTED`

## Rate Limits (default)

| Channel | Per Minute | Per Hour | Per Day |
|---------|-----------|----------|---------|
| email | 10 | 100 | 500 |
| push | 5 | 50 | 200 |
| sms | 2 | 10 | 50 |
| whatsapp | 3 | 30 | 150 |
| in_app | 20 | 200 | 1000 |

## Retry Logic

- Max retries: 3 (configurable per notification)
- Backoff: exponential (2^retryCount seconds)
- Events: `RETRY_SCHEDULED`, `RETRY_EXHAUSTED`

## Design Principles

- **Business-agnostic**: Templates are generic containers, not business-specific
- **Multi-tenant safe**: All operations scoped to tenantId
- **Provider-independent**: Register any provider for any channel
- **Preference-first**: Always checks user preferences before sending
- **Rate-limited**: Prevents spam at recipient, channel, and tenant levels
- **Observable**: Full analytics pipeline from send to click
