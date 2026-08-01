import { validatePayment } from './payment.schema.js'
import { PaymentValidationError, PaymentAmountError, PaymentConflictError } from './payment.errors.js'
import { isEditableStatus, isCancellableStatus, isRefundableStatus, PAYMENT_METHOD_LIST } from './payment.status.js'

export function validateCreateData(data) {
  const result = validatePayment(data)
  if (!result.valid) {
    throw new PaymentValidationError('Validation failed', { errors: result.errors })
  }
  if (data.total < 0) {
    throw new PaymentAmountError('Total amount cannot be negative', data.total)
  }
  if (data.paidAmount < 0) {
    throw new PaymentAmountError('Paid amount cannot be negative', data.paidAmount)
  }
  if (data.refundedAmount < 0) {
    throw new PaymentAmountError('Refunded amount cannot be negative', data.refundedAmount)
  }
  return data
}

export function validateUpdateData(data, currentStatus) {
  if (!isEditableStatus(currentStatus)) {
    throw new PaymentValidationError(
      `Cannot update payment in status: ${currentStatus}`
    )
  }
  const allowedFields = ['currency', 'method', 'metadata', 'reference']
  const updates = {}
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field]
    }
  }
  return updates
}

export function validateAmount(amount, fieldName = 'amount') {
  if (amount === undefined || amount === null) {
    throw new PaymentAmountError(`${fieldName} is required`)
  }
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new PaymentAmountError(`${fieldName} must be a valid number`)
  }
  if (amount < 0) {
    throw new PaymentAmountError(`${fieldName} cannot be negative`, amount)
  }
  return amount
}

export function validateCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    throw new PaymentValidationError('Currency is required and must be a string')
  }
  if (currency.length !== 3) {
    throw new PaymentValidationError('Currency must be a 3-letter ISO code')
  }
  return currency.toUpperCase()
}

export function validatePaymentMethod(method) {
  if (method && !PAYMENT_METHOD_LIST.includes(method)) {
    throw new PaymentValidationError(`Invalid payment method: ${method}`)
  }
  return method
}

export function validateRefundAmount(payment, refundAmount) {
  validateAmount(refundAmount, 'refundAmount')

  if (!isRefundableStatus(payment.status)) {
    throw new PaymentValidationError(`Payment cannot be refunded in status: ${payment.status}`)
  }

  const maxRefundable = payment.paidAmount - (payment.refundedAmount || 0)
  if (refundAmount > maxRefundable) {
    throw new PaymentValidationError(
      `Refund amount ${refundAmount} exceeds maximum refundable amount ${maxRefundable}`,
      { refundAmount, maxRefundable }
    )
  }

  return refundAmount
}

export function validateCancellation(payment) {
  if (!isCancellableStatus(payment.status)) {
    throw new PaymentConflictError(`Payment cannot be cancelled in status: ${payment.status}`)
  }
  return true
}

export async function validateBusinessOwnership(payment, context) {
  if (!payment.businessId) {
    throw new PaymentValidationError('Payment must belong to a Business')
  }
  const businessRepo = context?.repositories?.business
  if (businessRepo) {
    const business = await businessRepo.findById(payment.businessId)
    if (!business) {
      throw new PaymentValidationError(`Business not found: ${payment.businessId}`)
    }
    if (payment.reservationId && business.reservations) {
      const reservation = business.reservations.find(r => r.id === payment.reservationId)
      if (!reservation) {
        throw new PaymentValidationError(
          `Reservation ${payment.reservationId} does not belong to Business ${payment.businessId}`
        )
      }
    }
    return business
  }
  return null
}
