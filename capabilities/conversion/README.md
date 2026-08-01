# Conversion Capability

Customer Conversion & Retention Intelligence Layer.

## Purpose

Converts interactions into reservations and increases customer retention through intelligent scoring, automated recovery, follow-up sequences, and retention campaigns.

## Architecture

```
conversion/
├── conversion.capability.js    # Capability entry point
├── conversion.manager.js       # Orchestrates all sub-modules
├── conversion.schema.js        # Data schemas
├── conversion.events.js        # Event definitions
├── README.md                   # This file
├── scoring/
│   ├── customer.score.js       # Customer value and engagement scoring
│   ├── lead.score.js           # Lead quality scoring
│   └── opportunity.score.js    # Conversion opportunity detection
├── automation/
│   ├── recovery.engine.js      # Recover lost reservations
│   ├── followup.engine.js      # Automated follow-up sequences
│   └── retention.engine.js     # Customer retention and return campaigns
└── analytics/
    └── conversion.analytics.js # Conversion metrics tracking
```

## Key Concepts

### Customer Scoring
Calculates customer value (0-100) based on: reservations completed, cancellations, recency, engagement. Categories: new, interested, high_probability, returning, inactive.

### Lead Scoring
Analyzes potential customers based on: dates requested, availability match, communication frequency, abandonment signals. Levels: hot, warm, lukewarm, cold.

### Opportunity Detection
Identifies: date mismatches, inactive customers, empty dates, likely returns, high demand, abandoned reservations.

### Recovery Engine
Automatically recovers: abandoned reservations, inactive customers, date mismatches through CommunicationCapability.

### Follow-Up Engine
Sends automated messages: after inquiry, no response, before expiration. Uses EngagementCapability templates.

### Retention Engine
Transforms one-time customers into repeat customers: feedback requests, future travel detection, return campaigns.

## Integration

### CommunicationCapability
All messages sent through CommunicationCapability — never directly.

### EngagementCapability
Uses templates for follow-up messages. Coordinates with journey tracking.

### AvailabilityCapability
Detects availability mismatches for recovery. Uses existing parser.

### IntelligenceCapability
Uses opportunity engine for empty dates and demand signals.

### ObservabilityCapability
Metrics forwarded for dashboards and alerts.

## Events

| Event | When |
|-------|------|
| conversion:lead_created | Lead scored |
| conversion:score_updated | Customer score updated |
| conversion:opportunity_detected | Opportunity found |
| conversion:recovery_started | Recovery attempt started |
| conversion:recovered | Customer responded to recovery |
| conversion:followup_sent | Follow-up sent |
| conversion:returning_customer_detected | Repeat customer identified |

## Multi-Tenant

All data scoped to tenantId. No cross-tenant customer data access.
