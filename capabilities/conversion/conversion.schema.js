/**
 * Conversion Schema — Business-agnostic conversion data definitions
 *
 * Defines data structures for customer scores, lead scores, opportunities, recovery, follow-up
 */
import { createSchema } from '../core/schema.js'

export const CUSTOMER_CATEGORY = {
  NEW: 'new',
  INTERESTED: 'interested',
  HIGH_PROBABILITY: 'high_probability',
  RETURNING: 'returning',
  INACTIVE: 'inactive',
}

export const OPPORTUNITY_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
}

export const OPPORTUNITY_TYPE = {
  DATE_MISMATCH: 'date_mismatch',
  CUSTOMER_INACTIVE: 'customer_inactive',
  EMPTY_DATES: 'empty_dates',
  LIKELY_RETURN: 'likely_return',
  HIGH_DEMAND_APPROACHING: 'high_demand_approaching',
  ABANDONED_RESERVATION: 'abandoned_reservation',
}

export const RECOVERY_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  RESPONDED: 'responded',
  RECOVERED: 'recovered',
  FAILED: 'failed',
}

export const FOLLOWUP_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
}

export const CUSTOMER_SCORE_SCHEMA = createSchema({
  id: 'conversion_customer_score',
  name: 'Customer Score',
  description: 'Customer value and engagement score',
  fields: {
    customerId: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    score: { type: 'number', required: true, min: 0, max: 100 },
    category: { type: 'string', required: true, values: Object.values(CUSTOMER_CATEGORY) },
    signals: { type: 'array', required: false, items: { type: 'object' } },
    metrics: { type: 'object', required: false },
    calculatedAt: { type: 'string', required: true },
  },
})

export const LEAD_SCORE_SCHEMA = createSchema({
  id: 'conversion_lead_score',
  name: 'Lead Score',
  description: 'Potential customer engagement score',
  fields: {
    leadId: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    score: { type: 'number', required: true, min: 0, max: 100 },
    opportunityLevel: { type: 'string', required: true },
    recommendedAction: { type: 'string', required: true },
    signals: { type: 'array', required: false, items: { type: 'object' } },
    calculatedAt: { type: 'string', required: true },
  },
})

export const OPPORTUNITY_SCHEMA = createSchema({
  id: 'conversion_opportunity',
  name: 'Conversion Opportunity',
  description: 'A detected conversion opportunity',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    type: { type: 'string', required: true, values: Object.values(OPPORTUNITY_TYPE) },
    priority: { type: 'string', required: true, values: Object.values(OPPORTUNITY_PRIORITY) },
    customerId: { type: 'string', required: false },
    suggestedAction: { type: 'string', required: true },
    metadata: { type: 'object', required: false },
    detectedAt: { type: 'string', required: true },
  },
})

export const RECOVERY_ACTION_SCHEMA = createSchema({
  id: 'conversion_recovery',
  name: 'Recovery Action',
  description: 'A reservation recovery attempt',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    reservationId: { type: 'string', required: false },
    customerId: { type: 'string', required: false },
    type: { type: 'string', required: true },
    status: { type: 'string', required: true, values: Object.values(RECOVERY_STATUS) },
    channel: { type: 'string', required: true },
    message: { type: 'string', required: false },
    sentAt: { type: 'string', required: false },
    respondedAt: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export const FOLLOWUP_ACTION_SCHEMA = createSchema({
  id: 'conversion_followup',
  name: 'Follow-Up Action',
  description: 'An automated follow-up action',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    customerId: { type: 'string', required: false },
    type: { type: 'string', required: true },
    status: { type: 'string', required: true, values: Object.values(FOLLOWUP_STATUS) },
    channel: { type: 'string', required: true },
    message: { type: 'string', required: false },
    scheduledAt: { type: 'string', required: false },
    sentAt: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export function validateCustomerScore(data) {
  return CUSTOMER_SCORE_SCHEMA.validate(data)
}

export function validateLeadScore(data) {
  return LEAD_SCORE_SCHEMA.validate(data)
}

export function validateOpportunity(data) {
  return OPPORTUNITY_SCHEMA.validate(data)
}

export function validateRecoveryAction(data) {
  return RECOVERY_ACTION_SCHEMA.validate(data)
}

export function validateFollowupAction(data) {
  return FOLLOWUP_ACTION_SCHEMA.validate(data)
}
