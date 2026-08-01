/**
 * Automation Engine — Predefined Rules
 *
 * Common automation rules for booking and payment events
 * Business-agnostic: rules are generic event-driven automations
 */

export const BOOKING_CONFIRMED_RULE = {
  id: 'rule_booking_confirmed',
  tenantId: null,
  name: 'Booking Confirmed Notification',
  description: 'Sends confirmation email when a booking is confirmed',
  status: 'active',
  trigger: {
    type: 'event',
    eventName: 'booking:confirmed',
  },
  conditions: [
    {
      field: 'booking.customer.email',
      operator: 'is_not_empty',
    },
  ],
  actions: [
    {
      type: 'notification',
      config: {
        templateId: 'reservation_confirmation',
        recipient: '$booking.customer.email',
        variables: {
          customer_name: '$booking.customer.name',
          reservation_id: '$booking.id',
          reservation_date: '$booking.date',
        },
      },
    },
    {
      type: 'log',
      config: {
        message: 'Booking confirmed notification sent',
        level: 'info',
      },
    },
  ],
  cooldown: 60000,
  maxExecutions: 100,
}

export const PAYMENT_RECEIVED_RULE = {
  id: 'rule_payment_received',
  tenantId: null,
  name: 'Payment Received Notification',
  description: 'Sends payment confirmation when payment is received',
  status: 'active',
  trigger: {
    type: 'event',
    eventName: 'billing:payment_completed',
  },
  conditions: [],
  actions: [
    {
      type: 'notification',
      config: {
        templateId: 'payment_received',
        recipient: '$payment.customerEmail',
        variables: {
          customer_name: '$payment.customerName',
          amount: '$payment.amount',
        },
      },
    },
  ],
  cooldown: 0,
  maxExecutions: 1000,
}

export const BOOKING_CANCELLED_RULE = {
  id: 'rule_booking_cancelled',
  tenantId: null,
  name: 'Booking Cancellation Notification',
  description: 'Sends cancellation email when a booking is cancelled',
  status: 'active',
  trigger: {
    type: 'event',
    eventName: 'booking:cancelled',
  },
  conditions: [],
  actions: [
    {
      type: 'notification',
      config: {
        templateId: 'reservation_cancellation',
        recipient: '$booking.customer.email',
        variables: {
          customer_name: '$booking.customer.name',
          reservation_id: '$booking.id',
        },
      },
    },
  ],
  cooldown: 0,
  maxExecutions: 500,
}

export const SUBSCRIPTION_EXPIRING_RULE = {
  id: 'rule_subscription_expiring',
  tenantId: null,
  name: 'Subscription Expiring Alert',
  description: 'Sends alert when subscription is about to expire',
  status: 'active',
  trigger: {
    type: 'schedule',
    schedule: '0 9 * * *', // Daily at 9 AM
  },
  conditions: [
    {
      field: 'subscription.daysUntilExpiry',
      operator: 'lte',
      value: 7,
    },
  ],
  actions: [
    {
      type: 'notification',
      config: {
        templateId: 'subscription_expiring',
        recipient: '$subscription.ownerEmail',
        variables: {
          customer_name: '$subscription.ownerName',
          plan_name: '$subscription.planName',
          date: '$subscription.expiryDate',
        },
      },
    },
  ],
  cooldown: 86400000, // 24 hours
  maxExecutions: 30,
}

export const PREDEFINED_RULES = [
  BOOKING_CONFIRMED_RULE,
  PAYMENT_RECEIVED_RULE,
  BOOKING_CANCELLED_RULE,
  SUBSCRIPTION_EXPIRING_RULE,
]
