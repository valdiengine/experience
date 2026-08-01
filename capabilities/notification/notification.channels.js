export const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
  IN_APP: 'in_app',
})

export const NOTIFICATION_CHANNEL_LIST = Object.values(NOTIFICATION_CHANNELS)

export const NOTIFICATION_CHANNEL_LABELS = Object.freeze({
  [NOTIFICATION_CHANNELS.EMAIL]: 'Email',
  [NOTIFICATION_CHANNELS.SMS]: 'SMS',
  [NOTIFICATION_CHANNELS.PUSH]: 'Push Notification',
  [NOTIFICATION_CHANNELS.WHATSAPP]: 'WhatsApp',
  [NOTIFICATION_CHANNELS.IN_APP]: 'In-App',
})

export const NOTIFICATION_TYPES = Object.freeze({
  RESERVATION_CREATED: 'reservation_created',
  RESERVATION_CONFIRMED: 'reservation_confirmed',
  RESERVATION_CANCELLED: 'reservation_cancelled',
  RESERVATION_REMINDER: 'reservation_reminder',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_COMPLETED: 'refund_completed',
  VISITOR_WELCOME: 'visitor_welcome',
  VISITOR_FEEDBACK: 'visitor_feedback',
  BUSINESS_WELCOME: 'business_welcome',
  SYSTEM_ALERT: 'system_alert',
  MARKETING: 'marketing',
})

export const NOTIFICATION_TYPE_LIST = Object.values(NOTIFICATION_TYPES)

export const NOTIFICATION_TYPE_LABELS = Object.freeze({
  [NOTIFICATION_TYPES.RESERVATION_CREATED]: 'Reservation Created',
  [NOTIFICATION_TYPES.RESERVATION_CONFIRMED]: 'Reservation Confirmed',
  [NOTIFICATION_TYPES.RESERVATION_CANCELLED]: 'Reservation Cancelled',
  [NOTIFICATION_TYPES.RESERVATION_REMINDER]: 'Reservation Reminder',
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: 'Payment Received',
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: 'Payment Failed',
  [NOTIFICATION_TYPES.REFUND_COMPLETED]: 'Refund Completed',
  [NOTIFICATION_TYPES.VISITOR_WELCOME]: 'Visitor Welcome',
  [NOTIFICATION_TYPES.VISITOR_FEEDBACK]: 'Visitor Feedback',
  [NOTIFICATION_TYPES.BUSINESS_WELCOME]: 'Business Welcome',
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'System Alert',
  [NOTIFICATION_TYPES.MARKETING]: 'Marketing',
})

export const NOTIFICATION_PRIORITIES = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
})

export const NOTIFICATION_PRIORITY_LIST = Object.values(NOTIFICATION_PRIORITIES)

export const NOTIFICATION_PRIORITY_LABELS = Object.freeze({
  [NOTIFICATION_PRIORITIES.LOW]: 'Low',
  [NOTIFICATION_PRIORITIES.NORMAL]: 'Normal',
  [NOTIFICATION_PRIORITIES.HIGH]: 'High',
  [NOTIFICATION_PRIORITIES.URGENT]: 'Urgent',
})

export function isValidChannel(channel) {
  return NOTIFICATION_CHANNEL_LIST.includes(channel)
}

export function isValidType(type) {
  return NOTIFICATION_TYPE_LIST.includes(type)
}

export function isValidPriority(priority) {
  return NOTIFICATION_PRIORITY_LIST.includes(priority)
}
