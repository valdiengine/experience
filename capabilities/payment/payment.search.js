import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from './payment.status.js'

export class PaymentSearch {
  static toPayload(payment) {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      destinationId: payment.destinationId || null,
      businessId: payment.businessId,
      reservationId: payment.reservationId || null,
      visitorId: payment.visitorId || null,
      currency: payment.currency,
      subtotal: payment.subtotal,
      discount: payment.discount || 0,
      taxes: payment.taxes || 0,
      fees: payment.fees || 0,
      commission: payment.commission || 0,
      total: payment.total,
      paidAmount: payment.paidAmount || 0,
      remainingAmount: payment.remainingAmount || payment.total,
      refundedAmount: payment.refundedAmount || 0,
      status: payment.status,
      statusLabel: PAYMENT_STATUS_LABELS[payment.status] || payment.status,
      method: payment.method || null,
      provider: payment.provider || null,
      reference: payment.reference || null,
      transactionId: payment.transactionId || null,
      paymentDate: payment.paidAt || null,
      refundStatus: payment.refundedAmount > 0
        ? payment.refundedAmount >= payment.paidAmount
          ? 'fully_refunded'
          : 'partially_refunded'
        : null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }
  }

  static getSearchFields() {
    return [
      'id',
      'tenantId',
      'destinationId',
      'businessId',
      'reservationId',
      'visitorId',
      'currency',
      'status',
      'method',
      'provider',
      'reference',
      'transactionId',
    ]
  }

  static getFilterableFields() {
    return {
      equals: ['id', 'tenantId', 'businessId', 'reservationId', 'visitorId', 'status', 'currency', 'method'],
      range: ['total', 'paidAmount', 'remainingAmount', 'refundedAmount', 'createdAt', 'paidAt'],
      contains: ['reference', 'transactionId'],
    }
  }

  static getSortableFields() {
    return [
      'createdAt',
      'updatedAt',
      'paidAt',
      'total',
      'paidAmount',
      'remainingAmount',
      'refundedAmount',
    ]
  }

  static buildQuery(filter = {}) {
    const query = { bool: { must: [], filter: [] } }

    if (filter.tenantId) {
      query.bool.filter.push({ term: { tenantId: filter.tenantId } })
    }

    if (filter.businessId) {
      query.bool.filter.push({ term: { businessId: filter.businessId } })
    }

    if (filter.reservationId) {
      query.bool.filter.push({ term: { reservationId: filter.reservationId } })
    }

    if (filter.visitorId) {
      query.bool.filter.push({ term: { visitorId: filter.visitorId } })
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
      query.bool.filter.push({ terms: { status: statuses } })
    }

    if (filter.currency) {
      query.bool.filter.push({ term: { currency: filter.currency } })
    }

    if (filter.method) {
      query.bool.filter.push({ term: { method: filter.method } })
    }

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      const range = {}
      if (filter.minAmount !== undefined) range.gte = filter.minAmount
      if (filter.maxAmount !== undefined) range.lte = filter.maxAmount
      query.bool.filter.push({ range: { total: range } })
    }

    if (filter.fromDate || filter.toDate) {
      const range = {}
      if (filter.fromDate) range.gte = filter.fromDate
      if (filter.toDate) range.lte = filter.toDate
      query.bool.filter.push({ range: { createdAt: range } })
    }

    if (filter.text) {
      query.bool.must.push({
        multi_match: {
          query: filter.text,
          fields: ['reference', 'transactionId'],
        },
      })
    }

    return query
  }
}
