/**
 * Reservation View — Manages reservation display and status
 *
 * Business-agnostic: displays reservation data, no business logic
 * Uses context for capability communication
 */
import { RESERVATION_STATUS } from '../reservation.status.js'

export class ReservationView {
  #context = null
  #reservation = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Load reservation by ID
   * @param {string} reservationId
   * @returns {object|null}
   */
  loadReservation(reservationId) {
    const reservation = this.#context?.dataManager?.get(`reservations.${reservationId}`)
    if (!reservation) {
      const reservations = this.#context?.dataManager?.get('reservations') || []
      this.#reservation = reservations.find(r => r.id === reservationId) || null
    } else {
      this.#reservation = reservation
    }
    return this.#reservation
  }

  /**
   * Set reservation to display
   * @param {object} reservation
   */
  setReservation(reservation) {
    this.#reservation = reservation
  }

  /**
   * Get current reservation
   * @returns {object|null}
   */
  getReservation() {
    return this.#reservation
  }

  /**
   * Get reservation status display info
   * @returns {object|null}
   */
  getStatusInfo() {
    if (!this.#reservation) return null

    const statusMap = {
      [RESERVATION_STATUS.REQUESTED]: {
        label: 'Request Pending',
        color: '#F59E0B',
        icon: 'clock',
        description: 'Your reservation request is being reviewed',
      },
      [RESERVATION_STATUS.OWNER_PENDING]: {
        label: 'Awaiting Confirmation',
        color: '#3B82F6',
        icon: 'user-check',
        description: 'Waiting for owner confirmation',
      },
      [RESERVATION_STATUS.OWNER_CONFIRMED]: {
        label: 'Owner Confirmed',
        color: '#10B981',
        icon: 'check-circle',
        description: 'Owner has confirmed your reservation',
      },
      [RESERVATION_STATUS.PAYMENT_PENDING]: {
        label: 'Payment Required',
        color: '#F59E0B',
        icon: 'credit-card',
        description: 'Payment is required to confirm your reservation',
      },
      [RESERVATION_STATUS.CONFIRMED]: {
        label: 'Confirmed',
        color: '#10B981',
        icon: 'check-circle',
        description: 'Your reservation is confirmed',
      },
      [RESERVATION_STATUS.COMPLETED]: {
        label: 'Completed',
        color: '#6B7280',
        icon: 'flag',
        description: 'Reservation has been completed',
      },
      [RESERVATION_STATUS.CANCELLED]: {
        label: 'Cancelled',
        color: '#EF4444',
        icon: 'x-circle',
        description: 'This reservation has been cancelled',
      },
      [RESERVATION_STATUS.REJECTED]: {
        label: 'Rejected',
        color: '#EF4444',
        icon: 'x-circle',
        description: 'This reservation was not accepted',
      },
      [RESERVATION_STATUS.EXPIRED]: {
        label: 'Expired',
        color: '#9CA3AF',
        icon: 'clock',
        description: 'This reservation has expired',
      },
      [RESERVATION_STATUS.NO_RESPONSE]: {
        label: 'No Response',
        color: '#9CA3AF',
        icon: 'alert',
        description: 'No response was received',
      },
    }

    return statusMap[this.#reservation.status] || null
  }

  /**
   * Get formatted dates
   * @returns {{ checkIn: string, checkOut: string, nights: number }|null}
   */
  getFormattedDates() {
    if (!this.#reservation?.dates) return null

    const checkIn = this.#reservation.dates.checkIn
    const checkOut = this.#reservation.dates.checkOut
    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    )

    return {
      checkIn: this.#formatDateDisplay(checkIn),
      checkOut: this.#formatDateDisplay(checkOut),
      nights,
    }
  }

  /**
   * Get customer info
   * @returns {object|null}
   */
  getCustomerInfo() {
    return this.#reservation?.customer || null
  }

  /**
   * Get reservation summary
   * @returns {object|null}
   */
  getSummary() {
    if (!this.#reservation) return null

    const status = this.getStatusInfo()
    const dates = this.getFormattedDates()
    const customer = this.getCustomerInfo()

    return {
      id: this.#reservation.id,
      status: status?.label || this.#reservation.status,
      statusColor: status?.color || '#6B7280',
      statusDescription: status?.description || '',
      dates,
      customer: {
        name: customer?.name || '',
        email: customer?.email || '',
      },
      guests: this.#reservation.guests || 1,
      resource: this.#reservation.resourceId,
      createdAt: this.#formatDateDisplay(this.#reservation.createdAt),
    }
  }

  /**
   * Check if reservation can be cancelled
   * @returns {boolean}
   */
  canCancel() {
    if (!this.#reservation) return false
    const nonCancellable = [
      RESERVATION_STATUS.CANCELLED,
      RESERVATION_STATUS.COMPLETED,
      RESERVATION_STATUS.REJECTED,
      RESERVATION_STATUS.EXPIRED,
    ]
    return !nonCancellable.includes(this.#reservation.status)
  }

  /**
   * Cancel reservation
   * @param {string} reason
   * @returns {Promise<object>}
   */
  async cancel(reason = '') {
    if (!this.#reservation) {
      return { success: false, error: 'No reservation loaded' }
    }

    if (!this.canCancel()) {
      return { success: false, error: 'Cannot cancel this reservation' }
    }

    const capability = this.#context?.capabilities?.get?.('reservation')
    if (capability) {
      return capability.cancelReservation(this.#reservation.id, reason)
    }

    return { success: false, error: 'Reservation capability not available' }
  }

  // ── Private Methods ──

  #formatDateDisplay(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
}
