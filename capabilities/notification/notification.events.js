export const NOTIFICATION_EVENTS = Object.freeze({
  CREATED: 'notification:created',
  UPDATED: 'notification:updated',
  SCHEDULED: 'notification:scheduled',
  PROCESSING: 'notification:processing',
  SENT: 'notification:sent',
  DELIVERED: 'notification:delivered',
  FAILED: 'notification:failed',
  RETRIED: 'notification:retried',
  CANCELLED: 'notification:cancelled',
  ARCHIVED: 'notification:archived',
  RESTORED: 'notification:restored',
  DELETED: 'notification:deleted',
  PREFERENCES_UPDATED: 'notification:preferences_updated',
  ERROR: 'notification:error',
})

export const NOTIFICATION_EVENT_LIST = Object.values(NOTIFICATION_EVENTS)
