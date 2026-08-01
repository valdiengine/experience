/**
 * Conversion Capability — Customer Conversion & Retention Intelligence Layer
 *
 * Business-agnostic: converts interactions into reservations, increases retention
 * No direct capability imports — uses context.capabilities.get()
 */
import { BaseCapability } from '../core/base.capability.js'
import { ConversionManager } from './conversion.manager.js'
import { CONVERSION_EVENTS } from './conversion.events.js'

export class ConversionCapability extends BaseCapability {
  static id = 'conversion'
  static name = 'Conversion'
  static version = '1.0.0'
  static dependencies = ['communication', 'engagement', 'reservation', 'availability', 'intelligence', 'observability']

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new ConversionManager(context)
  }

  async activate() {
    this.#manager.init()
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }
  get customerScore() { return this.#manager?.customerScore }
  get leadScore() { return this.#manager?.leadScore }
  get opportunityScore() { return this.#manager?.opportunityScore }
  get recovery() { return this.#manager?.recovery }
  get followup() { return this.#manager?.followup }
  get retention() { return this.#manager?.retention }
  get analytics() { return this.#manager?.analytics }

  // ── Scoring ──

  scoreCustomer(customerId) {
    return this.#manager?.scoreCustomer(customerId) || null
  }

  scoreLead(leadData) {
    return this.#manager?.scoreLead(leadData) || null
  }

  getOpportunities() {
    return this.#manager?.getOpportunities() || []
  }

  // ── Recovery ──

  async recoverReservation(reservation) {
    return this.#manager?.recovery?.recoverReservation(reservation) || { success: false }
  }

  async recoverInactiveCustomer(customerData) {
    return this.#manager?.recovery?.recoverInactiveCustomer(customerData) || { success: false }
  }

  async recoverDateMismatch(data) {
    return this.#manager?.recovery?.recoverDateMismatch(data) || { success: false }
  }

  getRecoveryStats() {
    return this.#manager?.recovery?.getStats() || {}
  }

  // ── Follow-Up ──

  async sendInquiryFollowUp(leadData) {
    return this.#manager?.followup?.sendInquiryFollowUp(leadData) || { success: false }
  }

  async sendNoResponseFollowUp(leadData) {
    return this.#manager?.followup?.sendNoResponseFollowUp(leadData) || { success: false }
  }

  async sendExpirationFollowUp(reservationData) {
    return this.#manager?.followup?.sendExpirationFollowUp(reservationData) || { success: false }
  }

  getFollowUpStats() {
    return this.#manager?.followup?.getStats() || {}
  }

  // ── Retention ──

  async sendReturnCampaign() {
    return this.#manager?.sendReturnCampaign() || []
  }

  getReturningCustomers() {
    return this.#manager?.getReturningCustomers() || []
  }

  getRetentionStats() {
    return this.#manager?.retention?.getStats() || {}
  }

  // ── Detection ──

  async detectAllOpportunities() {
    return this.#manager?.detectAllOpportunities() || []
  }

  // ── Events ──

  async onReservationCreated(reservation) {
    return this.#manager?.onReservationCreated(reservation)
  }

  async onReservationExpired(reservation) {
    return this.#manager?.onReservationExpired(reservation)
  }

  async onReservationCompleted(reservation) {
    return this.#manager?.onReservationCompleted(reservation)
  }

  async onReservationCancelled(reservation) {
    return this.#manager?.onReservationCancelled(reservation)
  }

  // ── Analytics ──

  getConversionMetrics() {
    return this.#manager?.getConversionMetrics() || {}
  }

  getMetrics() {
    return this.#manager?.analytics?.getAll() || []
  }
}

export default ConversionCapability
