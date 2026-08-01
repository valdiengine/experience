# Observability Capability

Production-grade observability foundation for the multi-tenant platform.

## Structure

```
observability/
├── observability.capability.js  — Capability entry point
├── observability.manager.js     — Orchestrates metrics, health, alerts
├── observability.schema.js      — Metric and alert schemas
├── observability.events.js      — Event definitions
├── metrics.collector.js         — Event-driven metric collection
├── health.monitor.js            — System health checks
├── alert.manager.js             — Alert creation and management
└── README.md
```

## Features

- **Metrics Collection**: Listens to EventBus events, records counters/gauges
- **Health Monitoring**: Capability status, scheduler health, provider availability
- **Alert Management**: Critical/warning/info alerts with resolution tracking
- **Tenant Isolation**: All metrics and alerts are tenant-scoped
- **Auto-Detection**: Automatically detects issues and creates alerts

## Usage

```js
const obs = context.capabilities.get('observability')

// Get full report
const report = await obs.getReport('tenant_123')

// Check if attention needed
const attention = await obs.checkAttention('tenant_123')

// Get metrics
const metrics = obs.getMetricsSummary('tenant_123')

// Get alerts
const alerts = obs.getActiveAlerts('tenant_123')

// Record custom metric
obs.recordMetric({
  tenantId: 'tenant_123',
  category: 'reservation',
  type: 'counter',
  name: 'custom_event',
  value: 1,
})
```

## Rules

- Never contains business logic
- Metrics are generated from events
- All metrics are tenant scoped
- Capabilities expose events, observability consumes them
- Never imports business capabilities directly
- Never accesses providers directly
