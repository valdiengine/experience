/**
 * Reservation Config — Tenant-configurable timeout settings
 *
 * Business-agnostic: configurable timeouts for reservation lifecycle
 */
export const DEFAULT_RESERVATION_CONFIG = {
  ownerPendingTimeout: 24 * 60 * 60 * 1000,
  paymentTimeout: 6 * 60 * 60 * 1000,
  requestedTimeout: 12 * 60 * 60 * 1000,
  autoExpiration: true,
  reminderSchedule: [
    { hours: 1, message: 'Recordatorio: solicitud pendiente' },
    { hours: 12, message: 'Recordatorio: respuesta esperada' },
  ],
}

export class ReservationConfig {
  #config = {}
  #context = null

  constructor(context) {
    this.#context = context
    this.#config = { ...DEFAULT_RESERVATION_CONFIG }
    this.#loadTenantConfig()
  }

  /**
   * Get timeout for status
   * @param {string} status - Reservation status
   * @returns {number} - Timeout in milliseconds
   */
  getTimeout(status) {
    const timeouts = {
      REQUESTED: this.#config.requestedTimeout,
      OWNER_PENDING: this.#config.ownerPendingTimeout,
      PAYMENT_PENDING: this.#config.paymentTimeout,
    }
    return timeouts[status] || this.#config.ownerPendingTimeout
  }

  /**
   * Get auto expiration setting
   * @returns {boolean}
   */
  getAutoExpiration() {
    return this.#config.autoExpiration
  }

  /**
   * Get reminder schedule
   * @returns {object[]}
   */
  getReminderSchedule() {
    return this.#config.reminderSchedule || []
  }

  /**
   * Get all config
   * @returns {object}
   */
  getAll() {
    return { ...this.#config }
  }

  /**
   * Update config
   * @param {object} updates
   */
  update(updates) {
    this.#config = { ...this.#config, ...updates }
  }

  /**
   * Load tenant-specific config from DataManager
   * @private
   */
  #loadTenantConfig() {
    const tenantId = this.#context?.tenant?.id
    if (!tenantId) return

    const tenantConfig = this.#context?.dataManager?.get(`tenantConfig.${tenantId}.reservation`)
    if (tenantConfig) {
      this.#config = { ...this.#config, ...tenantConfig }
    }
  }
}
