import { BUSINESS_PAYMENT_EVENTS } from '../business.events.js'
import { BusinessOrchestrationError } from '../business.errors.js'
import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
import { BUSINESS_STATUS } from '../business.status.js'

export class BusinessPaymentManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #payment() {
    return this.#context?.capabilities?.get?.('payment')
  }

  get #businessRepo() {
    return this.#context?.repositories?.business || null
  }

  get #reservationManager() {
    return this.#context?.capabilities?.get?.('business')?.manager?.getReservationManager?.()
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'business')
    } catch {
      throw new BusinessOrchestrationError(`Missing permission: ${permission}`)
    }
  }

  async #assertBusinessActive(businessId) {
    const business = await this.#businessRepo?.findById(businessId)
    if (!business) throw new BusinessOrchestrationError(`Business not found: ${businessId}`)
    if (business.status === BUSINESS_STATUS.ARCHIVED) {
      throw new BusinessOrchestrationError('Archived businesses cannot manage payments')
    }
    if (business.status === BUSINESS_STATUS.DELETED) {
      throw new BusinessOrchestrationError('Deleted businesses cannot manage payments')
    }
    return business
  }

  async #assertPaymentBelongsToBusiness(paymentId, businessId) {
    const payment = await this.#delegateManager('getById', paymentId, null)
    if (!payment) throw new BusinessOrchestrationError(`Payment not found: ${paymentId}`)
    if (payment.businessId !== businessId) {
      throw new BusinessOrchestrationError('Payment does not belong to this business')
    }
    return payment
  }

  #delegateService(method, ...args) {
    const cap = this.#payment
    if (!cap?.service) throw new BusinessOrchestrationError('Payment capability not available')
    const fn = cap.service[method]
    if (!fn) throw new BusinessOrchestrationError(`Payment service method not found: ${method}`)
    return fn.call(cap.service, ...args)
  }

  #delegateManager(method, ...args) {
    const cap = this.#payment
    if (!cap?.manager) throw new BusinessOrchestrationError('Payment capability not available')
    const fn = cap.manager[method]
    if (!fn) throw new BusinessOrchestrationError(`Payment manager method not found: ${method}`)
    return fn.call(cap.manager, ...args)
  }

  getPaymentCapability() {
    return this.#payment
  }

  // ── Payment Lifecycle ──

  async createPayment(businessId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const paymentData = { ...data, businessId }
    const result = await this.#delegateService('create', paymentData, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_CREATED, { businessId, paymentId: result.payment?.id, payment: result.payment, identity })
    }
    return result
  }

  async updatePayment(businessId, paymentId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('update', paymentId, data, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_UPDATED, { businessId, paymentId, changes: data, identity })
    }
    return result
  }

  async authorizePayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('authorize', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_AUTHORIZED, { businessId, paymentId, identity })
    }
    return result
  }

  async capturePayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('capture', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_CAPTURED, { businessId, paymentId, identity })
    }
    return result
  }

  async markPaid(businessId, paymentId, amount, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('markPaid', paymentId, amount, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_PAID, { businessId, paymentId, amount, identity })
    }
    return result
  }

  async cancelPayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.CANCEL)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('cancel', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_CANCELLED, { businessId, paymentId, identity })
    }
    return result
  }

  async expirePayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('expire', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_EXPIRED, { businessId, paymentId, identity })
    }
    return result
  }

  async refundPayment(businessId, paymentId, amount, identity, reason = '') {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('refund', paymentId, amount, identity, reason)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_REFUNDED, { businessId, paymentId, amount, reason, identity })
    }
    return result
  }

  async partialRefundPayment(businessId, paymentId, amount, identity, reason = '') {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('partialRefund', paymentId, amount, identity, reason)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_PARTIALLY_REFUNDED, { businessId, paymentId, amount, reason, identity })
    }
    return result
  }

  async archivePayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('archive', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_ARCHIVED, { businessId, paymentId, identity })
    }
    return result
  }

  async restorePayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('restore', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_RESTORED, { businessId, paymentId, identity })
    }
    return result
  }

  async deletePayment(businessId, paymentId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    const result = await this.#delegateService('delete', paymentId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_DELETED, { businessId, paymentId, identity })
    }
    return result
  }

  // ── Payment Queries ──

  async findPayment(businessId, paymentId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payment = await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    return payment
  }

  async findPayments(businessId, filter, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findByBusiness', businessId, identity)
    if (!filter) return payments
    if (filter.status) return payments.filter((p) => p.status === filter.status)
    if (filter.method) return payments.filter((p) => p.method === filter.method)
    if (filter.reservationId) return payments.filter((p) => p.reservationId === filter.reservationId)
    if (filter.visitorId) return payments.filter((p) => p.visitorId === filter.visitorId)
    return payments
  }

  async findPaymentByReservation(businessId, reservationId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findByReservation', reservationId, identity)
    return payments.filter((p) => p.businessId === businessId)
  }

  async findPaymentsByVisitor(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findByVisitor', visitorId, identity)
    return payments.filter((p) => p.businessId === businessId)
  }

  async findPendingPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findPending', identity)
    return payments.filter((p) => p.businessId === businessId)
  }

  async findPaidPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findPaid', identity)
    return payments.filter((p) => p.businessId === businessId)
  }

  async findFailedPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findFailed', identity)
    return payments.filter((p) => p.businessId === businessId)
  }

  async findRefundedPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.#delegateService('findRefunded', identity)
    return payments.filter((p) => p.businessId === businessId)
  }

  async findExpiredPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    return payments.filter((p) => p.status === 'expired')
  }

  async getPayment(businessId, paymentId, identity) {
    return this.findPayment(businessId, paymentId, identity)
  }

  async getBusinessPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('findByBusiness', businessId, identity)
  }

  async paymentExists(businessId, paymentId, identity) {
    const payment = await this.findPayment(businessId, paymentId, identity)
    return !!payment
  }

  async countPayments(businessId, identity) {
    const payments = await this.getBusinessPayments(businessId, identity)
    return payments.length
  }

  // ── Business Aggregation ──

  async getBusinessRevenue(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const paidPayments = payments.filter((p) => p.status === 'paid' || p.status === 'partially_refunded' || p.status === 'refunded')
    const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
    const totalRefunded = paidPayments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0)
    return {
      businessId,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      netRevenue: Math.round((totalRevenue - totalRefunded) * 100) / 100,
      paidPayments: paidPayments.length,
      totalPayments: payments.length,
    }
  }

  async getBusinessOutstandingPayments(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const outstanding = payments.filter((p) => p.status === 'pending' || p.status === 'authorized' || p.status === 'partially_paid')
    const totalOutstanding = outstanding.reduce((sum, p) => sum + (p.remainingAmount || 0), 0)
    return {
      businessId,
      count: outstanding.length,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    }
  }

  async getBusinessRefunds(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const refunded = payments.filter((p) => p.status === 'refunded' || p.status === 'partially_refunded')
    const totalRefunded = refunded.reduce((sum, p) => sum + (p.refundedAmount || 0), 0)
    return {
      businessId,
      count: refunded.length,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
    }
  }

  async getBusinessCommissions(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const totalCommission = payments.reduce((sum, p) => sum + (p.commission || 0), 0)
    return {
      businessId,
      totalCommission: Math.round(totalCommission * 100) / 100,
      paymentCount: payments.length,
    }
  }

  async getBusinessPaymentStatistics(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const byStatus = {}
    for (const p of payments) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
    }
    const totalVolume = payments.reduce((sum, p) => sum + (p.total || 0), 0)
    const totalPaid = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
    const totalRefunded = payments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0)
    const totalCommission = payments.reduce((sum, p) => sum + (p.commission || 0), 0)
    return {
      businessId,
      totalPayments: payments.length,
      byStatus,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      averagePayment: payments.length > 0 ? Math.round((totalVolume / payments.length) * 100) / 100 : 0,
    }
  }

  async getBusinessPaymentSummary(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const [payments, revenue, outstanding, refunds, commissions, statistics] = await Promise.all([
      this.getBusinessPayments(businessId, identity),
      this.getBusinessRevenue(businessId, identity),
      this.getBusinessOutstandingPayments(businessId, identity),
      this.getBusinessRefunds(businessId, identity),
      this.getBusinessCommissions(businessId, identity),
      this.getBusinessPaymentStatistics(businessId, identity),
    ])
    return {
      businessId,
      ...revenue,
      ...outstanding,
      ...refunds,
      ...commissions,
      totalPayments: statistics.totalPayments,
      byStatus: statistics.byStatus,
      averagePayment: statistics.averagePayment,
    }
  }

  async getBusinessCashFlow(businessId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const start = new Date(startDate)
    const end = new Date(endDate)
    const inRange = payments.filter((p) => {
      const date = new Date(p.paidAt || p.createdAt)
      return date >= start && date <= end
    })
    const inflow = inRange.filter((p) => p.status === 'paid').reduce((sum, p) => sum + (p.paidAmount || 0), 0)
    const outflow = inRange.filter((p) => p.status === 'refunded' || p.status === 'partially_refunded').reduce((sum, p) => sum + (p.refundedAmount || 0), 0)
    return {
      businessId,
      startDate,
      endDate,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      netFlow: Math.round((inflow - outflow) * 100) / 100,
      transactionCount: inRange.length,
    }
  }

  async getBusinessRevenueByPeriod(businessId, period, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.getBusinessPayments(businessId, identity)
    const paidPayments = payments.filter((p) => p.paidAt && (p.status === 'paid' || p.status === 'refunded' || p.status === 'partially_refunded'))
    const byPeriod = {}
    for (const p of paidPayments) {
      const date = new Date(p.paidAt)
      let key
      if (period === 'daily') {
        key = date.toISOString().split('T')[0]
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (period === 'yearly') {
        key = String(date.getFullYear())
      }
      if (!byPeriod[key]) byPeriod[key] = { revenue: 0, count: 0, refunded: 0 }
      byPeriod[key].revenue += p.paidAmount || 0
      byPeriod[key].refunded += p.refundedAmount || 0
      byPeriod[key].count++
    }
    for (const key of Object.keys(byPeriod)) {
      byPeriod[key].revenue = Math.round(byPeriod[key].revenue * 100) / 100
      byPeriod[key].refunded = Math.round(byPeriod[key].refunded * 100) / 100
      byPeriod[key].net = Math.round((byPeriod[key].revenue - byPeriod[key].refunded) * 100) / 100
    }
    return { businessId, period, breakdown: byPeriod }
  }

  async getBusinessPaymentDashboard(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const [payments, summary] = await Promise.all([
      this.getBusinessPayments(businessId, identity),
      this.getBusinessPaymentSummary(businessId, identity),
    ])
    const recentPayments = [...payments].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 10)
    const pendingCount = payments.filter((p) => p.status === 'pending').length
    const failedCount = payments.filter((p) => p.status === 'failed').length
    return {
      businessId,
      ...summary,
      recentPayments,
      pendingCount,
      failedCount,
      lastUpdated: new Date().toISOString(),
    }
  }

  // ── Reservation Coordination ──

  async createReservationPayment(businessId, reservationId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const reservation = await this.#reservationManager?.getReservation(businessId, reservationId, identity)
    if (!reservation) throw new BusinessOrchestrationError(`Reservation not found: ${reservationId}`)
    const paymentData = {
      ...data,
      businessId,
      reservationId,
      visitorId: reservation.visitorId || data.visitorId || null,
    }
    const result = await this.#delegateService('create', paymentData, identity)
    if (result?.success) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_CREATED, { businessId, reservationId, paymentId: result.payment?.id, payment: result.payment, identity })
    }
    return result
  }

  async cancelReservationPayment(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.CANCEL)
    const payments = await this.findPaymentByReservation(businessId, reservationId, identity)
    const cancellable = payments.filter((p) => p.status !== 'cancelled' && p.status !== 'refunded' && p.status !== 'expired' && p.status !== 'archived')
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const p of cancellable) {
      try {
        await this.cancelPayment(businessId, p.id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: p.id, error: err.message })
      }
    }
    return results
  }

  async expireReservationPayment(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const payments = await this.findPaymentByReservation(businessId, reservationId, identity)
    const expirabl = payments.filter((p) => p.status === 'pending' || p.status === 'authorized')
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const p of expirabl) {
      try {
        await this.expirePayment(businessId, p.id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: p.id, error: err.message })
      }
    }
    return results
  }

  async refundReservationPayment(businessId, reservationId, amount, identity, reason = '') {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const payments = await this.findPaymentByReservation(businessId, reservationId, identity)
    const refundable = payments.filter((p) => p.status === 'paid' || p.status === 'partially_refunded')
    if (refundable.length === 0) throw new BusinessOrchestrationError('No refundable payments found for reservation')
    const firstRefundable = refundable[0]
    return this.refundPayment(businessId, firstRefundable.id, amount, identity, reason)
  }

  async findReservationPayment(businessId, reservationId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.findPaymentByReservation(businessId, reservationId, identity)
  }

  // ── Visitor Coordination ──

  async getVisitorPayments(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.findPaymentsByVisitor(businessId, visitorId, identity)
  }

  async getVisitorOutstandingBalance(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.findPaymentsByVisitor(businessId, visitorId, identity)
    const outstanding = payments.filter((p) => p.status === 'pending' || p.status === 'authorized' || p.status === 'partially_paid')
    const totalOutstanding = outstanding.reduce((sum, p) => sum + (p.remainingAmount || 0), 0)
    return {
      businessId,
      visitorId,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      outstandingPayments: outstanding.length,
    }
  }

  async getVisitorPaymentHistory(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const payments = await this.findPaymentsByVisitor(businessId, visitorId, identity)
    return payments.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }

  async refundVisitorPayments(businessId, visitorId, paymentIds, amount, identity, reason = '') {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const payments = await this.findPaymentsByVisitor(businessId, visitorId, identity)
    const targetIds = new Set(paymentIds)
    const refundable = payments.filter((p) => targetIds.has(p.id) && (p.status === 'paid' || p.status === 'partially_refunded'))
    const results = { succeeded: 0, failed: 0, errors: [], totalRefunded: 0 }
    for (const p of refundable) {
      try {
        const refundAmount = Math.min(amount / refundable.length, p.paidAmount - (p.refundedAmount || 0))
        const result = await this.refundPayment(businessId, p.id, refundAmount, identity, reason)
        if (result?.success) {
          results.succeeded++
          results.totalRefunded += refundAmount
        }
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: p.id, error: err.message })
      }
    }
    results.totalRefunded = Math.round(results.totalRefunded * 100) / 100
    return results
  }

  // ── Batch Operations ──

  async archiveBusinessPayments(businessId, paymentIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of paymentIds) {
      try {
        await this.archivePayment(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: id, error: err.message })
      }
    }
    return results
  }

  async restoreBusinessPayments(businessId, paymentIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of paymentIds) {
      try {
        await this.restorePayment(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: id, error: err.message })
      }
    }
    return results
  }

  async cancelPendingPayments(businessId, paymentIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.CANCEL)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of paymentIds) {
      try {
        await this.cancelPayment(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: id, error: err.message })
      }
    }
    return results
  }

  async expirePendingPayments(businessId, paymentIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of paymentIds) {
      try {
        await this.expirePayment(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId: id, error: err.message })
      }
    }
    return results
  }

  async bulkRefundPayments(businessId, paymentIds, amounts, identity, reason = '') {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    if (paymentIds.length !== amounts.length) {
      throw new BusinessOrchestrationError('Payment IDs and amounts must have the same length')
    }
    const results = { succeeded: 0, failed: 0, errors: [], totalRefunded: 0 }
    for (let i = 0; i < paymentIds.length; i++) {
      const paymentId = paymentIds[i]
      const amount = amounts[i]
      try {
        await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
        const result = await this.refundPayment(businessId, paymentId, amount, identity, reason)
        if (result?.success) {
          results.succeeded++
          results.totalRefunded += amount
        }
      } catch (err) {
        results.failed++
        results.errors.push({ paymentId, error: err.message })
      }
    }
    results.totalRefunded = Math.round(results.totalRefunded * 100) / 100
    return results
  }

  async cancelAllPendingPayments(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.CANCEL)
    const pending = await this.findPendingPayments(businessId, identity)
    const pendingIds = pending.map((p) => p.id)
    return this.cancelPendingPayments(businessId, pendingIds, identity)
  }

  async expireAllPendingPayments(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const pending = await this.findPendingPayments(businessId, identity)
    const pendingIds = pending.map((p) => p.id)
    return this.expirePendingPayments(businessId, pendingIds, identity)
  }

  // ── Search Integration ──

  async refreshPaymentSearch(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const search = this.#context?.runtime?.search
    const payments = await this.getBusinessPayments(businessId, identity)
    let indexed = 0
    for (const p of payments) {
      try {
        await search?.index?.('payment', { ...p, businessId })
        indexed++
      } catch { }
    }
    this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_SEARCH_UPDATED, { businessId, indexed, total: payments.length, identity })
    return { businessId, indexed, total: payments.length }
  }

  async refreshPaymentStatistics(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const summary = await this.getBusinessPaymentSummary(businessId, identity)
    const fields = {
      paymentCount: summary.totalPayments,
      paymentTotal: summary.totalVolume,
      paymentPending: summary.outstanding?.count || 0,
      paymentPaid: summary.byStatus?.paid || 0,
      paymentFailed: summary.byStatus?.failed || 0,
      paymentRefunded: summary.byStatus?.refunded || 0,
      paymentOutstanding: summary.outstanding?.totalOutstanding || 0,
      paymentRevenue: summary.netRevenue || 0,
      paymentCommission: summary.totalCommission || 0,
      lastPaymentSync: new Date().toISOString(),
    }
    await this.#businessRepo?.update({ id: businessId }, fields)
    this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_SUMMARY_UPDATED, { businessId, ...fields, identity })
    return { businessId, ...fields }
  }

  // ── Business Rules: Cascade ──

  async cascadeArchive(businessId, identity) {
    try {
      const payments = await this.getBusinessPayments(businessId, null)
      for (const p of payments) {
        if (p.status === 'archived') continue
        await this.#delegateService('archive', p.id, null)
      }
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_ARCHIVED, { businessId, action: 'cascade_archive', identity })
    } catch (err) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_ERROR, { businessId, action: 'cascade_archive', error: err.message })
    }
  }

  async cascadeRestore(businessId, identity) {
    try {
      const payments = await this.getBusinessPayments(businessId, null)
      for (const p of payments) {
        if (p.status !== 'archived') continue
        await this.#delegateService('restore', p.id, null)
      }
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_RESTORED, { businessId, action: 'cascade_restore', identity })
    } catch (err) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_ERROR, { businessId, action: 'cascade_restore', error: err.message })
    }
  }

  async cascadeDelete(businessId, identity) {
    try {
      const payments = await this.getBusinessPayments(businessId, null)
      for (const p of payments) {
        if (p.status === 'archived') continue
        await this.#delegateService('archive', p.id, null)
      }
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_ARCHIVED, { businessId, action: 'cascade_delete', identity })
    } catch (err) {
      this.#emit(BUSINESS_PAYMENT_EVENTS.PAYMENT_ERROR, { businessId, action: 'cascade_delete', error: err.message })
    }
  }

  // ── Utility ──

  async getRefundEligibility(businessId, paymentId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    await this.#assertPaymentBelongsToBusiness(paymentId, businessId)
    return this.#delegateService('getRefundEligibility', paymentId, identity)
  }

  async calculateFees(businessId, subtotal, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('calculateFees', subtotal, options)
  }
}
