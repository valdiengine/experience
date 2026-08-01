/**
 * Availability Admin — Availability administration
 *
 * Business-agnostic: provides availability management through AvailabilityCapability
 * Calendar view, block/open dates, requests, conversations
 */
export class AvailabilityAdmin {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get availability calendar
   * @param {string} tenantId
   * @param {number} year
   * @param {number} month
   * @returns {object[]}
   */
  async getCalendar(tenantId, year, month) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.getCalendar) return []

    return availability.getCalendar(tenantId, year, month) || []
  }

  /**
   * Get availability for date range
   * @param {string} tenantId
   * @param {string} startDate
   * @param {string} endDate
   * @returns {object[]}
   */
  async getAvailability(tenantId, startDate, endDate) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.getAvailability) return []

    return availability.getAvailability(tenantId, startDate, endDate) || []
  }

  /**
   * Block dates
   * @param {string} tenantId
   * @param {object} blockData - { dates, reason, resourceId }
   * @returns {object}
   */
  async blockDates(tenantId, blockData) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.blockDates) {
      return { success: false, error: 'Availability capability not available' }
    }

    return availability.blockDates(tenantId, blockData)
  }

  /**
   * Open dates
   * @param {string} tenantId
   * @param {object} openData - { dates, resourceId }
   * @returns {object}
   */
  async openDates(tenantId, openData) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.openDates) {
      return { success: false, error: 'Availability capability not available' }
    }

    return availability.openDates(tenantId, openData)
  }

  /**
   * Get pending availability requests
   * @param {string} tenantId
   * @returns {object[]}
   */
  async getPendingRequests(tenantId) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.getPendingRequests) return []

    return availability.getPendingRequests(tenantId) || []
  }

  /**
   * Process availability response
   * @param {string} requestId
   * @param {string} response - Natural language response from owner
   * @returns {object}
   */
  async processResponse(requestId, response) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.processResponse) {
      return { success: false, error: 'Availability capability not available' }
    }

    return availability.processResponse(requestId, response)
  }

  /**
   * Request availability from owner
   * @param {string} tenantId
   * @param {object} requestData - { ownerId, dates, channel, message }
   * @returns {object}
   */
  async requestAvailability(tenantId, requestData) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.requestAvailability) {
      return { success: false, error: 'Availability capability not available' }
    }

    return availability.requestAvailability(tenantId, requestData)
  }

  /**
   * Check if date is available
   * @param {string} tenantId
   * @param {string} date
   * @returns {boolean}
   */
  async isAvailable(tenantId, date) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability?.isAvailable) return false

    return availability.isAvailable(tenantId, date)
  }

  /**
   * Get availability stats
   * @param {string} tenantId
   * @param {number} year
   * @param {number} month
   * @returns {object}
   */
  async getStats(tenantId, year, month) {
    const calendar = await this.getCalendar(tenantId, year, month)

    const total = calendar.length
    const available = calendar.filter(d => d.available).length
    const blocked = calendar.filter(d => !d.available && d.reason !== 'booked').length
    const booked = calendar.filter(d => d.reason === 'booked').length

    return {
      total,
      available,
      blocked,
      booked,
      occupancyRate: total > 0 ? Math.round((booked / total) * 100) : 0,
      availabilityRate: total > 0 ? Math.round((available / total) * 100) : 0,
    }
  }
}
