import { NOTIFICATION_STATUS_LABELS } from './notification.status.js'
import { NOTIFICATION_CHANNEL_LABELS, NOTIFICATION_TYPE_LABELS, NOTIFICATION_PRIORITY_LABELS } from './notification.channels.js'

export class NotificationSearch {
  static toPayload(notification) {
    return {
      notification_id: notification.id,
      tenant_id: notification.tenantId,
      business_id: notification.businessId,
      recipient_id: notification.recipientId,
      reservation_id: notification.reservationId,
      payment_id: notification.paymentId,
      visitor_id: notification.visitorId,
      type: notification.type,
      type_label: NOTIFICATION_TYPE_LABELS[notification.type] || notification.type,
      channel: notification.channel,
      channel_label: NOTIFICATION_CHANNEL_LABELS[notification.channel] || notification.channel,
      template_id: notification.templateId,
      subject: notification.subject,
      status: notification.status,
      status_label: NOTIFICATION_STATUS_LABELS[notification.status] || notification.status,
      priority: notification.priority,
      priority_label: NOTIFICATION_PRIORITY_LABELS[notification.priority] || notification.priority,
      scheduled_at: notification.scheduledAt,
      sent_at: notification.sentAt,
      delivered_at: notification.deliveredAt,
      failed_at: notification.failedAt,
      retry_count: notification.retryCount || 0,
      created_at: notification.createdAt,
      updated_at: notification.updatedAt,
      created_by: notification.createdBy,
    }
  }

  static fromPayload(payload) {
    return {
      id: payload.notification_id,
      tenantId: payload.tenant_id,
      businessId: payload.business_id,
      recipientId: payload.recipient_id,
      reservationId: payload.reservation_id,
      paymentId: payload.payment_id,
      visitorId: payload.visitor_id,
      type: payload.type,
      channel: payload.channel,
      templateId: payload.template_id,
      subject: payload.subject,
      status: payload.status,
      priority: payload.priority,
      scheduledAt: payload.scheduled_at,
      sentAt: payload.sent_at,
      deliveredAt: payload.delivered_at,
      failedAt: payload.failed_at,
      retryCount: payload.retry_count,
      createdAt: payload.created_at,
      updatedAt: payload.updated_at,
      createdBy: payload.created_by,
    }
  }

  static getSearchableFields() {
    return [
      'notification_id',
      'recipient_id',
      'business_id',
      'reservation_id',
      'payment_id',
      'type',
      'channel',
      'status',
      'subject',
    ]
  }

  static getFilterableFields() {
    return [
      'tenant_id',
      'business_id',
      'recipient_id',
      'reservation_id',
      'payment_id',
      'visitor_id',
      'type',
      'channel',
      'status',
      'priority',
      'scheduled_at',
      'sent_at',
      'delivered_at',
      'created_at',
    ]
  }

  static getSortableFields() {
    return [
      'created_at',
      'updated_at',
      'scheduled_at',
      'sent_at',
      'delivered_at',
      'priority',
    ]
  }
}
