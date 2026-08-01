/**
 * Billing Schema — Invoice, Payment, Transaction
 *
 * Business-agnostic: financial records only, no business logic
 */

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
}

export const PAYMENT_STATUSES = {
  CREATED: 'created',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

export const TRANSACTION_TYPES = {
  SUBSCRIPTION: 'subscription',
  UPGRADE: 'upgrade',
  RENEWAL: 'renewal',
  REFUND: 'refund',
}

export const INVOICE_SCHEMA = {
  id: null,
  tenantId: null,
  subscriptionId: null,
  planId: null,
  amount: 0,
  currency: 'CLP',
  status: INVOICE_STATUSES.DRAFT,
  items: [],
  metadata: {},
  createdAt: null,
  dueDate: null,
  paidAt: null,
}

export const PAYMENT_SCHEMA = {
  id: null,
  tenantId: null,
  invoiceId: null,
  provider: null,
  amount: 0,
  currency: 'CLP',
  status: PAYMENT_STATUSES.CREATED,
  externalId: null,
  metadata: {},
  createdAt: null,
  completedAt: null,
}

export const TRANSACTION_SCHEMA = {
  id: null,
  tenantId: null,
  type: null,
  amount: 0,
  currency: 'CLP',
  status: null,
  invoiceId: null,
  paymentId: null,
  reference: null,
  metadata: {},
  createdAt: null,
}

export function validateInvoice(data) {
  const errors = []
  if (!data?.id) errors.push('Invoice id is required')
  if (!data?.tenantId) errors.push('Tenant ID is required')
  if (!data?.subscriptionId) errors.push('Subscription ID is required')
  if (!data?.planId) errors.push('Plan ID is required')
  if (typeof data?.amount !== 'number' || data.amount < 0) errors.push('Amount must be a non-negative number')
  return { valid: errors.length === 0, errors }
}

export function validatePayment(data) {
  const errors = []
  if (!data?.id) errors.push('Payment id is required')
  if (!data?.tenantId) errors.push('Tenant ID is required')
  if (!data?.invoiceId) errors.push('Invoice ID is required')
  if (typeof data?.amount !== 'number' || data.amount < 0) errors.push('Amount must be a non-negative number')
  return { valid: errors.length === 0, errors }
}

export function validateTransaction(data) {
  const errors = []
  if (!data?.id) errors.push('Transaction id is required')
  if (!data?.tenantId) errors.push('Tenant ID is required')
  if (!data?.type) errors.push('Transaction type is required')
  if (!Object.values(TRANSACTION_TYPES).includes(data?.type)) {
    errors.push(`Invalid transaction type: ${data?.type}`)
  }
  return { valid: errors.length === 0, errors }
}
