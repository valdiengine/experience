/**
 * Reservation Admin — Reservation administration dashboard
 *
 * Business-agnostic: provides reservation management through ReservationCapability
 * Never imports reservation internals directly
 */
import { ADMIN_EVENTS } from '../admin.events.js'

export class ReservationAdmin {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get reservation dashboard data
   * @param {string} tenantId
   * @returns {object}
   */
  async getDashboard(tenantId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return { pending: [], confirmed: [], cancelled: [], expired: [], stats: {} }

    const all = await this.#getAllReservations(tenantId)

    return {
      pending: all.filter(r => r.status === 'requested' || r.status === 'owner_pending'),
      confirmed: all.filter(r => r.status === 'confirmed' || r.status === 'payment_pending'),
      cancelled: all.filter(r => r.status === 'cancelled'),
      expired: all.filter(r => r.status === 'expired' || r.status === 'no_response'),
      stats: this.#calculateStats(all),
    }
  }

  /**
   * Get reservations by status
   * @param {string} tenantId
   * @param {string} status
   * @returns {object[]}
   */
  async getByStatus(tenantId, status) {
    const all = await this.#getAllReservations(tenantId)
    return all.filter(r => r.status === status)
  }

  /**
   * Confirm reservation
   * @param {string} tenantId
   * @param {string} reservationId
   * @returns {object}
   */
  async confirm(tenantId, reservationId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation?.confirmReservation) {
      return { success: false, error: 'Reservation capability not available' }
    }

    const result = await reservation.confirmReservation(reservationId)
    if (result.success) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.RESERVATION_CONFIRMED, {
        tenantId,
        reservationId,
      })
    }
    return result
  }

  /**
   * Reject reservation
   * @param {string} tenantId
   * @param {string} reservationId
   * @param {string} reason
   * @returns {object}
   */
  async reject(tenantId, reservationId, reason) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation?.rejectReservation) {
      return { success: false, error: 'Reservation capability not available' }
    }

    const result = await reservation.rejectReservation(reservationId, reason)
    if (result.success) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.RESERVATION_REJECTED, {
        tenantId,
        reservationId,
        reason,
      })
    }
    return result
  }

  /**
   * Cancel reservation
   * @param {string} tenantId
   * @param {string} reservationId
   * @param {string} reason
   * @returns {object}
   */
  async cancel(tenantId, reservationId, reason) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation?.cancelReservation) {
      return { success: false, error: 'Reservation capability not available' }
    }

    const result = await reservation.cancelReservation(reservationId, reason)
    if (result.success) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.RESERVATION_CANCELLED, {
        tenantId,
        reservationId,
        reason,
      })
    }
    return result
  }

  /**
   * Get reservation details
   * @param {string} reservationId
   * @returns {object|null}
   */
  async getDetails(reservationId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation?.getReservation) return null
    return reservation.getReservation(reservationId)
  }

  /**
   * Search reservations
   * @param {string} tenantId
   * @param {object} filters - { dateFrom, dateTo, status, customer }
   * @returns {object[]}
   */
  async search(tenantId, filters = {}) {
    const all = await this.#getAllReservations(tenantId)
    let results = all

    if (filters.status) {
      results = results.filter(r => r.status === filters.status)
    }
    if (filters.dateFrom) {
      results = results.filter(r => r.dates?.checkIn >= filters.dateFrom)
    }
    if (filters.dateTo) {
      results = results.filter(r => r.dates?.checkOut <= filters.dateTo)
    }
    if (filters.customer) {
      const term = filters.customer.toLowerCase()
      results = results.filter(r =>
        r.customer?.name?.toLowerCase().includes(term) ||
        r.customer?.email?.toLowerCase().includes(term)
      )
    }

    return results
  }

  // ── Private ──

  async #getAllReservations(tenantId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation?.getAll) return []
    return reservation.getAll(tenantId) || []
  }

  #calculateStats(reservations) {
    const total = reservations.length
    const confirmed = reservations.filter(r => r.status === 'confirmed').length
    const pending = reservations.filter(r => r.status === 'requested' || r.status === 'owner_pending').length
    const cancelled = reservations.filter(r => r.status === 'cancelled').length
    const expired = reservations.filter(r => r.status === 'expired' || r.status === 'no_response').length

    return {
      total,
      confirmed,
      pending,
      cancelled,
      expired,
      conversionRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    }
  }
}
