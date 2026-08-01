/**
 * Recovery Engine — Recover lost reservations
 *
 * Business-agnostic: sends recovery messages through CommunicationCapability
 * No direct capability imports — uses context.capabilities.get()
 */
import { RECOVERY_STATUS, validateRecoveryAction } from '../conversion.schema.js'
import { CONVERSION_EVENTS } from '../conversion.events.js'

export class RecoveryEngine {
  #context = null
  #actions = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Attempt to recover an abandoned reservation
   * @param {object} reservation
   * @returns {object} - Recovery action
   */
  async recoverReservation(reservation) {
    const action = {
      id: `recovery_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      reservationId: reservation.id,
      customerId: reservation.customer?.email || reservation.customer?.name,
      type: 'reservation_abandoned',
      status: RECOVERY_STATUS.PENDING,
      channel: reservation.customer?.channelPreference || 'email',
      message: null,
      createdAt: new Date().toISOString(),
    }

    const validation = validateRecoveryAction(action)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#actions.set(action.id, action)

    this.#context?.eventBus?.emit(CONVERSION_EVENTS.RECOVERY_STARTED, { action })

    const sent = await this.#sendRecoveryMessage(action, reservation)
    if (sent) {
      action.status = RECOVERY_STATUS.SENT
      action.sentAt = new Date().toISOString()
    }

    return { success: true, action }
  }

  /**
   * Recover inactive customer
   * @param {object} customerData - { customerId, name, email, lastInteraction }
   * @returns {object}
   */
  async recoverInactiveCustomer(customerData) {
    const action = {
      id: `recovery_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      customerId: customerData.customerId,
      type: 'customer_inactive',
      status: RECOVERY_STATUS.PENDING,
      channel: 'email',
      message: null,
      createdAt: new Date().toISOString(),
    }

    this.#actions.set(action.id, action)

    this.#context?.eventBus?.emit(CONVERSION_EVENTS.RECOVERY_STARTED, { action })

    const sent = await this.#sendInactiveMessage(action, customerData)
    if (sent) {
      action.status = RECOVERY_STATUS.SENT
      action.sentAt = new Date().toISOString()
    }

    return { success: true, action }
  }

  /**
   * Recover due to availability mismatch
   * @param {object} data - { customerId, requestedDates, alternativeDates }
   * @returns {object}
   */
  async recoverDateMismatch(data) {
    const action = {
      id: `recovery_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      customerId: data.customerId,
      type: 'date_mismatch',
      status: RECOVERY_STATUS.PENDING,
      channel: 'email',
      message: null,
      createdAt: new Date().toISOString(),
    }

    this.#actions.set(action.id, action)

    this.#context?.eventBus?.emit(CONVERSION_EVENTS.RECOVERY_STARTED, { action })

    const sent = await this.#sendDateMismatchMessage(action, data)
    if (sent) {
      action.status = RECOVERY_STATUS.SENT
      action.sentAt = new Date().toISOString()
    }

    return { success: true, action }
  }

  /**
   * Mark recovery as responded
   * @param {string} actionId
   */
  markResponded(actionId) {
    const action = this.#actions.get(actionId)
    if (action) {
      action.status = RECOVERY_STATUS.RESPONDED
      action.respondedAt = new Date().toISOString()
      this.#context?.eventBus?.emit(CONVERSION_EVENTS.RECOVERED, { actionId })
    }
  }

  /**
   * Get all recovery actions
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#actions.values())
  }

  /**
   * Get recovery actions by status
   * @param {string} status
   * @returns {object[]}
   */
  getByStatus(status) {
    return Array.from(this.#actions.values()).filter(a => a.status === status)
  }

  /**
   * Get recovery stats
   * @returns {object}
   */
  getStats() {
    const all = this.getAll()
    return {
      total: all.length,
      pending: all.filter(a => a.status === RECOVERY_STATUS.PENDING).length,
      sent: all.filter(a => a.status === RECOVERY_STATUS.SENT).length,
      responded: all.filter(a => a.status === RECOVERY_STATUS.RESPONDED).length,
      recovered: all.filter(a => a.status === RECOVERY_STATUS.RECOVERED).length,
      failed: all.filter(a => a.status === RECOVERY_STATUS.FAILED).length,
    }
  }

  // ── Message Sending ──

  async #sendRecoveryMessage(action, reservation) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return false

    const body = `Hello ${reservation.customer?.name || 'there'}, we noticed your reservation request is still pending. Would you like to complete it? We're here to help!`

    const result = await communication.send({
      channel: action.channel,
      recipient: action.customerId,
      body,
    })

    if (result.success) {
      action.message = body
      return true
    }

    action.status = RECOVERY_STATUS.FAILED
    this.#context?.eventBus?.emit(CONVERSION_EVENTS.RECOVERY_FAILED, { actionId: action.id })
    return false
  }

  async #sendInactiveMessage(action, customerData) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return false

    const body = `Hello ${customerData.name || 'there'}, we miss you! We have new availability — come check it out and book your next visit.`

    const result = await communication.send({
      channel: action.channel,
      recipient: action.customerId,
      body,
    })

    if (result.success) {
      action.message = body
      return true
    }

    action.status = RECOVERY_STATUS.FAILED
    return false
  }

  async #sendDateMismatchMessage(action, data) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return false

    const altDates = data.alternativeDates
      ? `We have availability on ${data.alternativeDates.join(', ')}.`
      : 'Would you like to check alternative dates?'

    const body = `Hello, the dates you requested are not available. ${altDates} Let us know what works for you!`

    const result = await communication.send({
      channel: action.channel,
      recipient: action.customerId,
      body,
    })

    if (result.success) {
      action.message = body
      return true
    }

    action.status = RECOVERY_STATUS.FAILED
    return false
  }
}
