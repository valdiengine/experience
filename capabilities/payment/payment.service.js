export class PaymentService {
  #manager

  constructor(manager) {
    this.#manager = manager
  }

  async create(data, identity) {
    return this.#manager.createPayment(data, identity)
  }

  async get(id, identity) {
    return this.#manager.getById(id, identity)
  }

  async list(filter, identity) {
    return this.#manager.getMany(filter, identity)
  }

  async update(id, data, identity) {
    return this.#manager.updatePayment(id, data, identity)
  }

  async authorize(id, identity) {
    return this.#manager.authorizePayment(id, identity)
  }

  async capture(id, identity) {
    return this.#manager.capturePayment(id, identity)
  }

  async markPaid(id, amount, identity) {
    return this.#manager.markPaid(id, amount, identity)
  }

  async cancel(id, identity) {
    return this.#manager.cancelPayment(id, identity)
  }

  async expire(id, identity) {
    return this.#manager.expirePayment(id, identity)
  }

  async refund(id, amount, identity, reason) {
    return this.#manager.refundPayment(id, amount, identity, reason)
  }

  async partialRefund(id, amount, identity, reason) {
    return this.#manager.partialRefund(id, amount, identity, reason)
  }

  async archive(id, identity) {
    return this.#manager.archivePayment(id, identity)
  }

  async restore(id, identity) {
    return this.#manager.restorePayment(id, identity)
  }

  async delete(id, identity) {
    return this.#manager.deletePayment(id, identity)
  }

  async findByReservation(reservationId, identity) {
    return this.#manager.findByReservation(reservationId, identity)
  }

  async findByBusiness(businessId, identity) {
    return this.#manager.findByBusiness(businessId, identity)
  }

  async findByVisitor(visitorId, identity) {
    return this.#manager.findByVisitor(visitorId, identity)
  }

  async findPending(identity) {
    return this.#manager.findPending(identity)
  }

  async findPaid(identity) {
    return this.#manager.findPaid(identity)
  }

  async findFailed(identity) {
    return this.#manager.findFailed(identity)
  }

  async findRefunded(identity) {
    return this.#manager.findRefunded(identity)
  }

  async calculateFees(subtotal, options) {
    return this.#manager.calculateFees(subtotal, options)
  }

  async getRefundEligibility(paymentId, identity) {
    return this.#manager.getRefundEligibility(paymentId, identity)
  }
}
