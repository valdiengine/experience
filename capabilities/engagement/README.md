# Engagement Capability

Customer Engagement & Notification Intelligence Layer.

## Purpose

Transforms the notification system into an intelligent engagement system that actively helps businesses obtain availability, recover opportunities, communicate with customers, and increase reservations.

## Architecture

```
engagement/
├── engagement.capability.js    # Capability entry point
├── engagement.manager.js       # Orchestrates all sub-modules
├── engagement.schema.js        # Data schemas
├── engagement.events.js        # Event definitions
├── README.md                   # This file
├── automation/
│   ├── trigger.engine.js       # Automated event triggers
│   ├── campaign.manager.js     # Tenant campaign management
│   └── journey.manager.js      # Customer lifecycle tracking
├── messages/
│   ├── template.manager.js     # Reusable message templates
│   └── message.builder.js      # Message construction from templates
└── analytics/
    └── engagement.analytics.js # Metrics tracking
```

## Key Concepts

### Triggers
Automated actions based on events. When a reservation is created, a confirmation is sent. When demand is low, availability is requested.

### Campaigns
Tenant-scoped campaigns: seasonal, low demand, customer recovery, availability, custom.

### Customer Journey
Lifecycle tracking: visitor → inquiry → reservation requested → confirmed → during service → completed → returning.

### Templates
Reusable message templates with variable interpolation. Tenant configurable. Default templates for common scenarios.

### Analytics
Metrics tracking: messages sent/opened/responded, campaign performance, availability requests, conversion rates.

## Integration

### CommunicationCapability
Messages sent through CommunicationCapability — never directly.

### AvailabilityCapability
Availability requests through AvailabilityCapability — no duplication.

### IntelligenceCapability
Uses opportunity engine to detect empty periods and trigger availability requests.

### NotificationCapability
Fallback for notifications when CommunicationCapability is unavailable.

### SchedulerCapability
Scheduled jobs for weekly availability requests, reminders, follow-ups.

### ObservabilityCapability
Metrics forwarded to ObservabilityCapability — no independent analytics storage.

## Default Templates

| Name | Channel | Purpose |
|------|---------|---------|
| reservation_confirmation | email | Sent on reservation creation |
| reservation_confirmed | email | Sent on reservation confirmation |
| reservation_cancelled | email | Sent on reservation cancellation |
| reservation_reminder | email | Sent before arrival |
| availability_request | whatsapp | Owner availability request |
| customer_recovery | email | Re-engage inactive customers |
| seasonal_availability | email | Seasonal marketing |
| feedback_request | email | Post-stay feedback |

## Multi-Tenant

- All data scoped to tenantId
- Templates per tenant
- Campaigns per tenant
- Journeys per tenant
- Analytics per tenant

## Events

| Event | When |
|-------|------|
| engagement:created | Engagement created |
| engagement:triggered | Trigger fired |
| engagement:message_sent | Message sent |
| engagement:response_received | Response received |
| engagement:campaign_started | Campaign started |
| engagement:campaign_completed | Campaign completed |
| engagement:availability_requested | Availability requested |
| engagement:opportunity_detected | Opportunity detected |
