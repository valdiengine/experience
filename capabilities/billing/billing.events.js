/**
 * Billing Events — Invoice, Payment, Subscription Billing, Refund
 */

export const BILLING_EVENTS = {
  INVOICE_CREATED: 'billing:invoice_created',
  INVOICE_SENT: 'billing:invoice_sent',
  INVOICE_PAID: 'billing:invoice_paid',
  INVOICE_FAILED: 'billing:invoice_failed',
  INVOICE_CANCELLED: 'billing:invoice_cancelled',
  INVOICE_OVERDUE: 'billing:invoice_overdue',

  PAYMENT_CREATED: 'billing:payment_created',
  PAYMENT_PROCESSING: 'billing:payment_processing',
  PAYMENT_COMPLETED: 'billing:payment_completed',
  PAYMENT_FAILED: 'billing:payment_failed',
  PAYMENT_CANCELLED: 'billing:payment_cancelled',

  SUBSCRIPTION_BILLING_ACTIVATED: 'billing:subscription_activated',
  SUBSCRIPTION_BILLING_SUSPENDED: 'billing:subscription_suspended',
  SUBSCRIPTION_BILLING_CANCELLED: 'billing:subscription_cancelled',
  SUBSCRIPTION_BILLING_RENEWED: 'billing:subscription_renewed',

  REFUND_CREATED: 'billing:refund_created',
  REFUND_COMPLETED: 'billing:refund_completed',

  PROVIDER_ERROR: 'billing:provider_error',
}
