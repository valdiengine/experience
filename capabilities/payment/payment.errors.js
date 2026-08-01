export class PaymentError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'PaymentError'
    this.code = options.code || 'PAYMENT_ERROR'
    this.statusCode = options.statusCode || 500
    this.paymentId = options.paymentId || null
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message, details = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400 })
    this.name = 'PaymentValidationError'
    this.details = details
  }
}

export class PaymentNotFoundError extends PaymentError {
  constructor(identifier) {
    super(`Payment not found: ${identifier}`, { code: 'NOT_FOUND', statusCode: 404 })
    this.name = 'PaymentNotFoundError'
    this.identifier = identifier
  }
}

export class PaymentAlreadyPaidError extends PaymentError {
  constructor(paymentId) {
    super(`Payment already paid: ${paymentId}`, { code: 'ALREADY_PAID', statusCode: 409, paymentId })
    this.name = 'PaymentAlreadyPaidError'
  }
}

export class PaymentAlreadyRefundedError extends PaymentError {
  constructor(paymentId) {
    super(`Payment already refunded: ${paymentId}`, { code: 'ALREADY_REFUNDED', statusCode: 409, paymentId })
    this.name = 'PaymentAlreadyRefundedError'
  }
}

export class PaymentStateError extends PaymentError {
  constructor(message, currentStatus) {
    super(message, { code: 'INVALID_STATE', statusCode: 422 })
    this.name = 'PaymentStateError'
    this.currentStatus = currentStatus
  }
}

export class PaymentPermissionError extends PaymentError {
  constructor(message) {
    super(message, { code: 'PERMISSION_DENIED', statusCode: 403 })
    this.name = 'PaymentPermissionError'
  }
}

export class PaymentAmountError extends PaymentError {
  constructor(message, amount) {
    super(message, { code: 'INVALID_AMOUNT', statusCode: 400 })
    this.name = 'PaymentAmountError'
    this.amount = amount
  }
}

export class PaymentExpiredError extends PaymentError {
  constructor(paymentId, expiredAt) {
    super(`Payment expired: ${paymentId}`, { code: 'PAYMENT_EXPIRED', statusCode: 410, paymentId })
    this.name = 'PaymentExpiredError'
    this.expiredAt = expiredAt
  }
}

export class PaymentConflictError extends PaymentError {
  constructor(message) {
    super(message, { code: 'CONFLICT', statusCode: 409 })
    this.name = 'PaymentConflictError'
  }
}

export class PaymentRefundError extends PaymentError {
  constructor(message, refundAmount, maxRefundable) {
    super(message, { code: 'REFUND_ERROR', statusCode: 422 })
    this.name = 'PaymentRefundError'
    this.refundAmount = refundAmount
    this.maxRefundable = maxRefundable
  }
}
