/**
 * Observability Schema — Metric and health definitions
 *
 * Business-agnostic: generic metric types, no business logic
 */
import { createSchema } from '../core/schema.js'

export const METRIC_TYPE = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
}

export const METRIC_CATEGORY = {
  RESERVATION: 'reservation',
  SCHEDULER: 'scheduler',
  NOTIFICATION: 'notification',
  COMMUNICATION: 'communication',
  AVAILABILITY: 'availability',
  SYSTEM: 'system',
}

export const METRIC_SCHEMA = createSchema({
  id: 'observability_metric',
  name: 'Observability Metric',
  description: 'A recorded metric data point',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    category: { type: 'string', required: true, values: Object.values(METRIC_CATEGORY) },
    type: { type: 'string', required: true, values: Object.values(METRIC_TYPE) },
    name: { type: 'string', required: true },
    value: { type: 'number', required: true },
    timestamp: { type: 'string', required: true },
    metadata: { type: 'object', required: false },
  },
})

export const ALERT_SCHEMA = createSchema({
  id: 'observability_alert',
  name: 'Observability Alert',
  description: 'An alert for system issues',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    severity: { type: 'string', required: true, values: ['critical', 'warning', 'info'] },
    category: { type: 'string', required: true },
    message: { type: 'string', required: true },
    source: { type: 'string', required: true },
    status: { type: 'string', required: true, values: ['active', 'resolved', 'escalated'] },
    createdAt: { type: 'string', required: true },
    resolvedAt: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
  },
})

export function validateMetric(data) {
  return METRIC_SCHEMA.validate(data)
}

export function validateAlert(data) {
  return ALERT_SCHEMA.validate(data)
}
