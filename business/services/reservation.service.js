/**
 * Business Services — Reservation Service
 *
 * Thin orchestration layer between reservation capability and UI/workflows
 * Business-agnostic: no knowledge of what is being reserved
 */
export class ReservationService {
  #capabilities = null

  constructor(capabilities) {
    this.#capabilities = capabilities
  }

  /**
   * Create a reservation
   * @param {object} data - { tenantId, resource, date, customer, metadata }
   * @returns {Promise<object>}
   */
  async create(data) {
    const reservation = this.#capabilities.get('reservation')
    const availability = this.#capabilities.get('availability')
    const notifications = this.#capabilities.get('notifications')

    // Check availability
    const avail = await availability?.checkAvailability({
      tenantId: data.tenantId,
      resourceId: data.resource,
      date: data.date,
    })

    if (avail && !avail.available) {
      return { success: false, error: 'Resource not available', reason: avail.reason }
    }

    // Create reservation
    const result = await reservation?.create({
      tenantId: data.tenantId,
      resource: data.resource,
      date: data.date,
      customer: data.customer,
      metadata: data.metadata,
    })

    if (result?.success) {
      // Notify
      await notifications?.sendFromTemplate({
        tenantId: data.tenantId,
        templateId: 'reservation_confirmation',
        recipient: data.customer?.email,
        variables: {
          customer_name: data.customer?.name,
          reservation_id: result.id,
          reservation_date: data.date,
        },
      })
    }

    return result
  }

  /**
   * Confirm a reservation
   * @param {string} tenantId
   * @param {string} reservationId
   * @returns {Promise<object>}
   */
  async confirm(tenantId, reservationId) {
    const reservation = this.#capabilities.get('reservation')
    return reservation?.confirm(tenantId, reservationId)
  }

  /**
   * Cancel a reservation
   * @param {string} tenantId
   * @param {string} reservationId
   * @param {string} [reason]
   * @returns {Promise<object>}
   */
  async cancel(tenantId, reservationId, reason) {
    const reservation = this.#capabilities.get('reservation')
    const notifications = this.#capabilities.get('notifications')

    const result = await reservation?.cancel(tenantId, reservationId, reason)

    if (result?.success) {
      await notifications?.sendFromTemplate({
        tenantId,
        templateId: 'reservation_cancellation',
        recipient: result.customer?.email,
        variables: {
          customer_name: result.customer?.name,
          reservation_id: reservationId,
        },
      })
    }

    return result
  }

  /**
   * Get reservation by ID
   * @param {string} tenantId
   * @param {string} reservationId
   * @returns {object|null}
   */
  get(tenantId, reservationId) {
    const reservation = this.#capabilities.get('reservation')
    return reservation?.get(tenantId, reservationId) || null
  }

  /**
   * List reservations with filters
   * @param {string} tenantId
   * @param {object} [filters] - { status, dateFrom, dateTo, resource }
   * @returns {object[]}
   */
  list(tenantId, filters) {
    const reservation = this.#capabilities.get('reservation')
    return reservation?.list(tenantId, filters) || []
  }
}
