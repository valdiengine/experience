import { createSchema } from '../core/schema.js'
import { NOTIFICATION_STATUS_LIST, NOTIFICATION_CHANNEL_LIST, NOTIFICATION_TYPE_LIST, NOTIFICATION_PRIORITY_LIST } from './notification.channels.js'

export const NOTIFICATION_SCHEMA = createSchema({
  id: 'notification',
  name: 'Notification',
  description: 'A notification message sent to a recipient',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    businessId: { type: 'string', required: false },
    recipientId: { type: 'string', required: true },
    reservationId: { type: 'string', required: false },
    paymentId: { type: 'string', required: false },
    visitorId: { type: 'string', required: false },
    type: { type: 'string', required: true, values: NOTIFICATION_TYPE_LIST },
    channel: { type: 'string', required: true, values: NOTIFICATION_CHANNEL_LIST },
    templateId: { type: 'string', required: false },
    subject: { type: 'string', required: false },
    content: { type: 'string', required: true },
    metadata: { type: 'object', required: false },
    priority: { type: 'string', required: false, values: NOTIFICATION_PRIORITY_LIST, default: 'normal' },
    status: { type: 'string', required: true, values: NOTIFICATION_STATUS_LIST, default: 'draft' },
    scheduledAt: { type: 'string', required: false },
    sentAt: { type: 'string', required: false },
    deliveredAt: { type: 'string', required: false },
    failedAt: { type: 'string', required: false },
    retryCount: { type: 'number', required: false, default: 0 },
    errorMessage: { type: 'string', required: false },
    createdBy: { type: 'string', required: false },
    updatedBy: { type: 'string', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
    previousStatus: { type: 'string', required: false },
  },
})

export function validateNotification(data) {
  return NOTIFICATION_SCHEMA.validate(data)
}
