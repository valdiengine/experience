/**
 * Booking Capability — Multi-tenant reservation management
 *
 * Business-agnostic: works for tours, restaurants, professionals, retail, B2B
 * Delegates to DataManager — no direct data access
 * Activatable/deactivatable per tenant
 */
import { BaseCapability } from '../core/base.capability.js'
import { BOOKING_STATUS, validateBooking } from './booking.schema.js'
import { BOOKING_EVENTS } from './booking.events.js'

export class BookingCapability extends BaseCapability {
  static id = 'booking'
  static name = 'Booking'
  static version = '1.0.0'
  static dependencies = []

  #bookings = new Map()

  async init(context, config = {}) {
    await super.init(context, config)
    this.#loadBookings()
  }

  async activate() {
    this.on(BOOKING_EVENTS.CREATED, this.#onBookingCreated.bind(this))
    this.on(BOOKING_EVENTS.UPDATED, this.#onBookingUpdated.bind(this))
    this.on(BOOKING_EVENTS.CANCELLED, this.#onBookingCancelled.bind(this))
    await super.activate()
  }

  async deactivate() {
    this.#bookings.clear()
    await super.deactivate()
  }

  async destroy() {
    this.#bookings.clear()
    await super.destroy()
  }

  /**
   * Get all bookings for current tenant
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#bookings.values())
  }

  /**
   * Get booking by ID
   * @param {string} id - Booking ID
   * @returns {object|null}
   */
  getById(id) {
    return this.#bookings.get(id) || null
  }

  /**
   * Get bookings by status
   * @param {string} status - Booking status
   * @returns {object[]}
   */
  getByStatus(status) {
    return this.getAll().filter(b => b.status === status)
  }

  /**
   * Create booking (validates against schema)
   * @param {object} data - Booking data
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  create(data) {
    const validation = validateBooking(data)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const booking = {
      ...data,
      id: data.id || `booking_${Date.now()}`,
      tenantId: this.tenant?.id,
      status: data.status || BOOKING_STATUS.PENDING,
      createdAt: data.createdAt || new Date().toISOString(),
    }

    this.#bookings.set(booking.id, booking)
    this.emit(BOOKING_EVENTS.CREATED, { booking })
    return { success: true, booking }
  }

  /**
   * Update booking status
   * @param {string} id - Booking ID
   * @param {string} status - New status
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  updateStatus(id, status) {
    const booking = this.#bookings.get(id)
    if (!booking) {
      return { success: false, errors: ['Booking not found'] }
    }

    if (!Object.values(BOOKING_STATUS).includes(status)) {
      return { success: false, errors: ['Invalid status'] }
    }

    booking.status = status
    booking.updatedAt = new Date().toISOString()
    this.emit(BOOKING_EVENTS.UPDATED, { booking })
    return { success: true, booking }
  }

  /**
   * Cancel booking
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  cancel(id) {
    return this.updateStatus(id, BOOKING_STATUS.CANCELLED)
  }

  /**
   * Confirm booking
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  confirm(id) {
    return this.updateStatus(id, BOOKING_STATUS.CONFIRMED)
  }

  /**
   * Complete booking
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  complete(id) {
    return this.updateStatus(id, BOOKING_STATUS.COMPLETED)
  }

  /**
   * Load bookings from DataManager
   */
  #loadBookings() {
    const bookings = this.dataManager?.get('bookings') || []
    bookings.forEach(b => this.#bookings.set(b.id, b))
  }

  #onBookingCreated(event) {
    this.#bookings.set(event.booking.id, event.booking)
  }

  #onBookingUpdated(event) {
    this.#bookings.set(event.booking.id, event.booking)
  }

  #onBookingCancelled(event) {
    const booking = this.#bookings.get(event.booking.id)
    if (booking) {
      booking.status = BOOKING_STATUS.CANCELLED
      booking.updatedAt = new Date().toISOString()
    }
  }
}

export default BookingCapability
