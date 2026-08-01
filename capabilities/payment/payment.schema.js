import { createSchema } from '../core/schema.js'
import { PAYMENT_STATUS_LIST, PAYMENT_METHOD_LIST } from './payment.status.js'

export const PAYMENT_SCHEMA = createSchema({
  id: 'payment',
  name: 'Payment',
  description: 'A commercial payment transaction linked to a reservation',
  fields: {
    id: { type: 'string', required: false },
    tenantId: { type: 'string', required: true },
    destinationId: { type: 'string', required: false },
    businessId: { type: 'string', required: true },
    reservationId: { type: 'string', required: false },
    visitorId: { type: 'string', required: false },
    currency: { type: 'string', required: true, default: 'USD' },
    subtotal: { type: 'number', required: true, min: 0 },
    discount: { type: 'number', required: false, min: 0, default: 0 },
    taxes: { type: 'number', required: false, min: 0, default: 0 },
    fees: { type: 'number', required: false, min: 0, default: 0 },
    commission: { type: 'number', required: false, min: 0, default: 0 },
    total: { type: 'number', required: true, min: 0 },
    paidAmount: { type: 'number', required: false, min: 0, default: 0 },
    remainingAmount: { type: 'number', required: false, min: 0, default: 0 },
    refundedAmount: { type: 'number', required: false, min: 0, default: 0 },
    status: { type: 'string', required: true, values: PAYMENT_STATUS_LIST },
    method: { type: 'string', required: false, values: PAYMENT_METHOD_LIST },
    provider: { type: 'string', required: false },
    reference: { type: 'string', required: false },
    transactionId: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    createdBy: { type: 'string', required: false },
    updatedBy: { type: 'string', required: false },
    createdAt: { type: 'string', required: false },
    updatedAt: { type: 'string', required: false },
    paidAt: { type: 'string', required: false },
    expiredAt: { type: 'string', required: false },
    previousStatus: { type: 'string', required: false },
  },
})

export function validatePayment(data) {
  return PAYMENT_SCHEMA.validate(data)
}
