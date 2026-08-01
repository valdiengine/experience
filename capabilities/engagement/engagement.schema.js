/**
 * Engagement Schema — Business-agnostic engagement data definitions
 *
 * Defines data structures for triggers, campaigns, journeys, templates, analytics
 */
import { createSchema } from '../core/schema.js'

export const TRIGGER_TYPE = {
  RESERVATION_CREATED: 'reservation_created',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  RESERVATION_EXPIRED: 'reservation_expired',
  AVAILABILITY_REQUEST: 'availability_request',
  TIME_BASED: 'time_based',
  CUSTOMER_INACTIVE: 'customer_inactive',
  LOW_DEMAND: 'low_demand',
}

export const TRIGGER_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DISABLED: 'disabled',
}

export const JOURNEY_STAGE = {
  VISITOR: 'visitor',
  INQUIRY: 'inquiry',
  RESERVATION_REQUESTED: 'reservation_requested',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  DURING_SERVICE: 'during_service',
  COMPLETED: 'completed',
  RETURNING: 'returning',
}

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
}

export const CAMPAIGN_TYPE = {
  SEASONAL: 'seasonal',
  LOW_DEMAND: 'low_demand',
  CUSTOMER_RECOVERY: 'customer_recovery',
  AVAILABILITY: 'availability',
  CUSTOM: 'custom',
}

export const MESSAGE_DIRECTION = {
  OUTBOUND: 'outbound',
  INBOUND: 'inbound',
}

export const TRIGGER_SCHEMA = createSchema({
  id: 'engagement_trigger',
  name: 'Engagement Trigger',
  description: 'An automated trigger for customer engagement',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    type: { type: 'string', required: true, values: Object.values(TRIGGER_TYPE) },
    status: { type: 'string', required: true, values: Object.values(TRIGGER_STATUS) },
    name: { type: 'string', required: true },
    config: { type: 'object', required: true },
    action: { type: 'object', required: true },
    lastTriggeredAt: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export const CAMPAIGN_SCHEMA = createSchema({
  id: 'engagement_campaign',
  name: 'Engagement Campaign',
  description: 'A tenant campaign for customer engagement',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    type: { type: 'string', required: true, values: Object.values(CAMPAIGN_TYPE) },
    status: { type: 'string', required: true, values: Object.values(CAMPAIGN_STATUS) },
    config: { type: 'object', required: true },
    stats: { type: 'object', required: false },
    startedAt: { type: 'string', required: false },
    completedAt: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export const JOURNEY_SCHEMA = createSchema({
  id: 'engagement_journey',
  name: 'Customer Journey',
  description: 'Customer lifecycle journey tracking',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    customerId: { type: 'string', required: true },
    stage: { type: 'string', required: true, values: Object.values(JOURNEY_STAGE) },
    history: { type: 'array', required: false, items: { type: 'object' } },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

export const TEMPLATE_SCHEMA = createSchema({
  id: 'engagement_template',
  name: 'Message Template',
  description: 'A reusable message template with variables',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    channel: { type: 'string', required: true },
    subject: { type: 'string', required: false },
    body: { type: 'string', required: true },
    variables: { type: 'array', required: false, items: { type: 'string' } },
    category: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export const ENGAGEMENT_MESSAGE_SCHEMA = createSchema({
  id: 'engagement_message',
  name: 'Engagement Message',
  description: 'A tracked engagement message',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    customerId: { type: 'string', required: false },
    channel: { type: 'string', required: true },
    direction: { type: 'string', required: true, values: Object.values(MESSAGE_DIRECTION) },
    subject: { type: 'string', required: false },
    body: { type: 'string', required: true },
    templateId: { type: 'string', required: false },
    triggerId: { type: 'string', required: false },
    campaignId: { type: 'string', required: false },
    status: { type: 'string', required: true },
    sentAt: { type: 'string', required: false },
    openedAt: { type: 'string', required: false },
    respondedAt: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export function validateTrigger(data) {
  return TRIGGER_SCHEMA.validate(data)
}

export function validateCampaign(data) {
  return CAMPAIGN_SCHEMA.validate(data)
}

export function validateJourney(data) {
  return JOURNEY_SCHEMA.validate(data)
}

export function validateTemplate(data) {
  return TEMPLATE_SCHEMA.validate(data)
}

export function validateEngagementMessage(data) {
  return ENGAGEMENT_MESSAGE_SCHEMA.validate(data)
}
