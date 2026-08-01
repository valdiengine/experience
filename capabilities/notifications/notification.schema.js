/**
 * Notifications Capability — Schemas & Validation
 *
 * Business-agnostic: email, push, whatsapp, sms
 * These are DATA SCHEMAS only — no UI
 */
import { createSchema } from '../core/schema.js'

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  IN_APP: 'in_app',
}

export const NOTIFICATION_STATUS = {
  QUEUED: 'queued',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RATE_LIMITED: 'rate_limited',
}

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const TEMPLATE_VARIABLES = {
  TENANT_NAME: 'tenant_name',
  TENANT_SLUG: 'tenant_slug',
  CUSTOMER_NAME: 'customer_name',
  CUSTOMER_EMAIL: 'customer_email',
  BUSINESS_NAME: 'business_name',
  RESERVATION_ID: 'reservation_id',
  RESERVATION_DATE: 'reservation_date',
  RESERVATION_STATUS: 'reservation_status',
  PLAN_NAME: 'plan_name',
  AMOUNT: 'amount',
  DATE: 'date',
  YEAR: 'year',
  SUPPORT_EMAIL: 'support_email',
  WEBSITE_URL: 'website_url',
  LOGIN_URL: 'login_url',
}

export const NOTIFICATION_SCHEMA = createSchema({
  id: 'notification',
  name: 'Notification',
  description: 'A notification entity',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    channel: { type: 'string', required: true, values: Object.values(NOTIFICATION_CHANNELS) },
    status: { type: 'string', required: true, values: Object.values(NOTIFICATION_STATUS) },
    priority: { type: 'string', required: false, values: Object.values(NOTIFICATION_PRIORITY) },
    recipient: { type: 'string', required: true },
    recipientId: { type: 'string', required: false },
    templateId: { type: 'string', required: false },
    subject: { type: 'string', required: false },
    body: { type: 'string', required: true },
    htmlBody: { type: 'string', required: false },
    variables: { type: 'object', required: false },
    metadata: { type: 'object', required: false },
    scheduledAt: { type: 'string', required: false },
    sentAt: { type: 'string', required: false },
    deliveredAt: { type: 'string', required: false },
    openedAt: { type: 'string', required: false },
    clickedAt: { type: 'string', required: false },
    failedAt: { type: 'string', required: false },
    retryCount: { type: 'number', required: false },
    maxRetries: { type: 'number', required: false },
    batchSize: { type: 'number', required: false },
    batchId: { type: 'string', required: false },
    category: { type: 'string', required: false },
    tags: { type: 'array', required: false },
    source: { type: 'string', required: false },
    error: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export const NOTIFICATION_TEMPLATE_SCHEMA = createSchema({
  id: 'notification_template',
  name: 'Notification Template',
  description: 'A notification template with variable placeholders',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    channel: { type: 'string', required: true, values: Object.values(NOTIFICATION_CHANNELS) },
    category: { type: 'string', required: true },
    subject: { type: 'string', required: false },
    body: { type: 'string', required: true },
    htmlBody: { type: 'string', required: false },
    variables: { type: 'array', required: false },
    defaults: { type: 'object', required: false },
    enabled: { type: 'boolean', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

export const NOTIFICATION_PREFERENCE_SCHEMA = createSchema({
  id: 'notification_preference',
  name: 'Notification Preference',
  description: 'Per-user or per-tenant notification preferences',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    userId: { type: 'string', required: false },
    channel: { type: 'string', required: true, values: Object.values(NOTIFICATION_CHANNELS) },
    category: { type: 'string', required: true },
    enabled: { type: 'boolean', required: true },
    frequency: { type: 'string', required: false },
    quietHoursStart: { type: 'string', required: false },
    quietHoursEnd: { type: 'string', required: false },
    timezone: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

export const NOTIFICATION_SCHEDULE_SCHEMA = createSchema({
  id: 'notification_schedule',
  name: 'Notification Schedule',
  description: 'Scheduled notification configuration',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    templateId: { type: 'string', required: true },
    channel: { type: 'string', required: true, values: Object.values(NOTIFICATION_CHANNELS) },
    recipients: { type: 'array', required: true },
    variables: { type: 'object', required: false },
    scheduledAt: { type: 'string', required: true },
    recurring: { type: 'boolean', required: false },
    recurrenceRule: { type: 'string', required: false },
    status: { type: 'string', required: true },
    lastRun: { type: 'string', required: false },
    nextRun: { type: 'string', required: false },
    createdAt: { type: 'string', required: true },
  },
})

export const NOTIFICATION_BATCH_SCHEMA = createSchema({
  id: 'notification_batch',
  name: 'Notification Batch',
  description: 'Batch of notifications sent together',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    channel: { type: 'string', required: true, values: Object.values(NOTIFICATION_CHANNELS) },
    templateId: { type: 'string', required: false },
    count: { type: 'number', required: true },
    sent: { type: 'number', required: true },
    failed: { type: 'number', required: true },
    status: { type: 'string', required: true },
    startedAt: { type: 'string', required: true },
    completedAt: { type: 'string', required: false },
  },
})

export function validateNotification(data) {
  return NOTIFICATION_SCHEMA.validate(data)
}

export function validateTemplate(data) {
  return NOTIFICATION_TEMPLATE_SCHEMA.validate(data)
}

export function validatePreference(data) {
  return NOTIFICATION_PREFERENCE_SCHEMA.validate(data)
}

export function validateSchedule(data) {
  return NOTIFICATION_SCHEDULE_SCHEMA.validate(data)
}

export function validateBatch(data) {
  return NOTIFICATION_BATCH_SCHEMA.validate(data)
}
