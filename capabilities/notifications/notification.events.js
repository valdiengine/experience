/**
 * Notifications Capability — Events
 *
 * Standard events for notification lifecycle
 */
import { CAPABILITY_EVENTS } from '../core/events.js'

export const NOTIFICATION_EVENTS = {
  // Core lifecycle
  SENT: CAPABILITY_EVENTS.NOTIFICATION_SENT,
  FAILED: CAPABILITY_EVENTS.NOTIFICATION_FAILED,
  QUEUED: CAPABILITY_EVENTS.NOTIFICATION_QUEUED,

  // Delivery
  DELIVERED: 'notification:delivered',
  OPENED: 'notification:opened',
  CLICKED: 'notification:clicked',

  // Scheduling
  SCHEDULED: 'notification:scheduled',
  SCHEDULE_CANCELLED: 'notification:schedule_cancelled',
  SCHEDULE_TRIGGERED: 'notification:schedule_triggered',

  // Batching
  BATCH_CREATED: 'notification:batch_created',
  BATCH_COMPLETED: 'notification:batch_completed',
  BATCH_FAILED: 'notification:batch_failed',

  // Rate limiting
  RATE_LIMITED: 'notification:rate_limited',

  // Templates
  TEMPLATE_CREATED: 'notification:template_created',
  TEMPLATE_UPDATED: 'notification:template_updated',
  TEMPLATE_DELETED: 'notification:template_deleted',
  TEMPLATE_RENDERED: 'notification:template_rendered',

  // Preferences
  PREFERENCE_UPDATED: 'notification:preference_updated',

  // Retries
  RETRY_SCHEDULED: 'notification:retry_scheduled',
  RETRY_EXHAUSTED: 'notification:retry_exhausted',

  // Analytics
  ANALYTICS_UPDATED: 'notification:analytics_updated',
}
