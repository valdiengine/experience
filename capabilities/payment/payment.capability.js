import { BaseCapability } from '../core/base.capability.js'
import { PaymentManager } from './payment.manager.js'
import { PaymentService } from './payment.service.js'
import { PAYMENT_EVENTS } from './payment.events.js'
import { PaymentSearch } from './payment.search.js'

export class PaymentCapability extends BaseCapability {
  static id = 'payment'
  static name = 'Payment'
  static version = '1.0.0'
  static dependencies = []

  #manager
  #service

  async init(context, config) {
    await super.init(context, config)
    this.#manager = new PaymentManager(context)
    this.#service = new PaymentService(this.#manager)
  }

  async activate() {
    await super.activate()
    this.on(PAYMENT_EVENTS.CREATED, this.#handleCreated)
    this.on(PAYMENT_EVENTS.UPDATED, this.#handleUpdated)
    this.on(PAYMENT_EVENTS.AUTHORIZED, this.#handleAuthorized)
    this.on(PAYMENT_EVENTS.CAPTURED, this.#handleCaptured)
    this.on(PAYMENT_EVENTS.PAID, this.#handlePaid)
    this.on(PAYMENT_EVENTS.REFUNDED, this.#handleRefunded)
    this.on(PAYMENT_EVENTS.PARTIALLY_REFUNDED, this.#handlePartiallyRefunded)
    this.on(PAYMENT_EVENTS.CANCELLED, this.#handleCancelled)
    this.on(PAYMENT_EVENTS.EXPIRED, this.#handleExpired)
    this.on(PAYMENT_EVENTS.ARCHIVED, this.#handleArchived)
    this.on(PAYMENT_EVENTS.RESTORED, this.#handleRestored)
    this.on(PAYMENT_EVENTS.DELETED, this.#handleDeleted)
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    this.#service = null
    await super.destroy()
  }

  get manager() {
    return this.#manager
  }

  get service() {
    return this.#service
  }

  #handleCreated = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleUpdated = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleAuthorized = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleCaptured = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handlePaid = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleRefunded = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handlePartiallyRefunded = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleCancelled = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleExpired = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleArchived = async (data) => {
    this.#triggerSearchRemove(data.payment)
  }

  #handleRestored = async (data) => {
    this.#triggerSearchIndex(data.payment)
  }

  #handleDeleted = async (data) => {
    this.#triggerSearchRemove(data.payment)
  }

  #triggerSearchIndex(payment) {
    const search = this.context?.runtime?.search
    if (!search) return
    const payload = PaymentSearch.toPayload(payment)
    search.index('payment', payload).catch((err) => {
      console.error('[PaymentCapability] Search index failed:', err)
    })
  }

  #triggerSearchRemove(payment) {
    const search = this.context?.runtime?.search
    if (!search) return
    search.delete('payment', payment.id).catch((err) => {
      console.error('[PaymentCapability] Search remove failed:', err)
    })
  }
}
