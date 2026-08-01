/**
 * Owner Capability — Owner Portal & Business Dashboard
 *
 * Business-agnostic: orchestrates reservation, availability, communication, observability
 * Provides dashboard, reservation management, availability management,
 * customer management, metrics, and communication center
 * No business logic — only UI-level orchestration
 */
import { BaseCapability } from '../core/base.capability.js'
import { OwnerManager } from './owner.manager.js'
import { OWNER_EVENTS } from './owner.events.js'

export class OwnerCapability extends BaseCapability {
  static id = 'owner'
  static name = 'Owner'
  static version = '1.0.0'
  static dependencies = ['reservation', 'availability', 'communication', 'observability']

  #manager = null
  #ownerId = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new OwnerManager(context)
  }

  async activate() {
    await super.activate()
  }

  async deactivate() {
    this.#ownerId = null
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    this.#ownerId = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }

  // ── Initialization ──

  /**
   * Initialize owner portal
   * @param {string} ownerId
   */
  initOwner(ownerId) {
    this.#ownerId = ownerId
    this.#manager.init(ownerId)
    this.emit(OWNER_EVENTS.OWNER_LOGGED_IN, { ownerId })
  }

  // ── Dashboard ──

  async getDashboardData() {
    return this.#manager?.getDashboardData() || {}
  }

  // ── Reservations ──

  async getReservations(status) {
    return this.#manager?.getReservations(status) || []
  }

  async getReservationById(reservationId) {
    return this.#manager?.getReservationById(reservationId) || null
  }

  async confirmReservation(reservationId) {
    return this.#manager?.confirmReservation(reservationId) || { success: false, errors: ['Manager not initialized'] }
  }

  async rejectReservation(reservationId, reason) {
    return this.#manager?.rejectReservation(reservationId, reason) || { success: false, errors: ['Manager not initialized'] }
  }

  async cancelReservation(reservationId, reason) {
    return this.#manager?.cancelReservation(reservationId, reason) || { success: false, errors: ['Manager not initialized'] }
  }

  // ── Availability ──

  async blockDates(dates, notes) {
    return this.#manager?.blockDates(dates, notes) || { success: false, errors: ['Manager not initialized'] }
  }

  async openDates(dates, notes) {
    return this.#manager?.openDates(dates, notes) || { success: false, errors: ['Manager not initialized'] }
  }

  async writeAvailabilityNaturalLanguage(text) {
    return this.#manager?.writeAvailabilityNaturalLanguage(text) || { success: false, errors: ['Manager not initialized'] }
  }

  async getAvailability(startDate, endDate) {
    return this.#manager?.getAvailability(startDate, endDate) || []
  }

  // ── Customers ──

  getCustomers() {
    return this.#manager?.getCustomers() || []
  }

  addCustomerNote(customerName, notes) {
    return this.#manager?.addCustomerNote(customerName, notes) || { success: false }
  }

  // ── Communication ──

  async sendMessage(channel, recipient, body, subject) {
    return this.#manager?.sendMessage(channel, recipient, body, subject) || { success: false, errors: ['Manager not initialized'] }
  }

  getConversations() {
    return this.#manager?.getConversations() || []
  }

  // ── Metrics ──

  getMetrics() {
    return this.#manager?.getMetrics() || {}
  }

  getActiveAlerts() {
    return this.#manager?.getActiveAlerts() || []
  }
}

export default OwnerCapability
