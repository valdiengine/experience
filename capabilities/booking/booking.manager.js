/**
 * Booking Manager — Orchestrates booking operations
 *
 * Business-agnostic: works for tours, restaurants, professionals, retail, B2B
 * Handles: create requests, validate availability, save bookings, change states, emit events
 *
 * Flow:
 * Client → BookingManager → validate → save → emit event → NotificationManager
 */
import { BOOKING_STATUS, validateBooking } from './booking.schema.js'
import { BOOKING_EVENTS } from './booking.events.js'

export class BookingManager {
  #context = null
  #bookings = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Create a new booking request
   * @param {object} data - Booking data
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  async createRequest(data) {
    const validation = validateBooking(data)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const availability = await this.checkAvailability(data)
    if (!availability.available) {
      return { success: false, errors: availability.errors || ['Slot not available'] }
    }

    const booking = {
      ...data,
      id: data.id || `booking_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      status: data.status || BOOKING_STATUS.PENDING,
      createdAt: data.createdAt || new Date().toISOString(),
    }

    await this.save(booking)

    this.#emit(BOOKING_EVENTS.CREATED, { booking })

    return { success: true, booking }
  }

  /**
   * Check availability for a booking request
   * @param {object} data - Booking data
   * @returns {{ available: boolean, errors?: string[] }}
   */
  async checkAvailability(data) {
    if (!data.items || data.items.length === 0) {
      return { available: true }
    }

    const conflicts = this.#findConflicts(data)
    if (conflicts.length > 0) {
      return {
        available: false,
        errors: [`Slot not available: ${conflicts.map(c => c.id).join(', ')}`],
      }
    }

    return { available: true }
  }

  /**
   * Save booking to persistence layer
   * @param {object} booking - Booking to save
   */
  async save(booking) {
    this.#bookings.set(booking.id, booking)

    if (this.#context?.dataManager) {
      const bookings = this.#context.dataManager.get('bookings') || []
      bookings.push(booking)
      this.#context.dataManager.set('bookings', bookings)
    }
  }

  /**
   * Get all bookings
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
   * Change booking state
   * @param {string} id - Booking ID
   * @param {string} newStatus - New status
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  async changeState(id, newStatus) {
    const booking = this.#bookings.get(id)
    if (!booking) {
      return { success: false, errors: ['Booking not found'] }
    }

    if (!Object.values(BOOKING_STATUS).includes(newStatus)) {
      return { success: false, errors: ['Invalid status'] }
    }

    const oldStatus = booking.status
    booking.status = newStatus
    booking.updatedAt = new Date().toISOString()

    await this.save(booking)

    this.#emit(BOOKING_EVENTS.UPDATED, { booking, oldStatus, newStatus })

    if (newStatus === BOOKING_STATUS.CONFIRMED) {
      this.#emit(BOOKING_EVENTS.CONFIRMED, { booking })
    } else if (newStatus === BOOKING_EVENTS.CANCELLED) {
      this.#emit(BOOKING_EVENTS.CANCELLED, { booking })
    } else if (newStatus === BOOKING_STATUS.COMPLETED) {
      this.#emit(BOOKING_EVENTS.COMPLETED, { booking })
    }

    return { success: true, booking }
  }

  /**
   * Confirm booking
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  async confirm(id) {
    return this.changeState(id, BOOKING_STATUS.CONFIRMED)
  }

  /**
   * Cancel booking
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  async cancel(id) {
    return this.changeState(id, BOOKING_STATUS.CANCELLED)
  }

  /**
   * Complete booking
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  async complete(id) {
    return this.changeState(id, BOOKING_STATUS.COMPLETED)
  }

  /**
   * Mark booking as no-show
   * @param {string} id - Booking ID
   * @returns {{ success: boolean, booking?: object, errors?: string[] }}
   */
  async noShow(id) {
    return this.changeState(id, BOOKING_STATUS.NO_SHOW)
  }

  /**
   * Load bookings from DataManager
   */
  loadFromDataManager() {
    const bookings = this.#context?.dataManager?.get('bookings') || []
    bookings.forEach(b => this.#bookings.set(b.id, b))
  }

  /**
   * Find scheduling conflicts for a booking request
   * @private
   * @param {object} data - Booking data
   * @returns {object[]}
   */
  #findConflicts(data) {
    const existingBookings = this.getAll()
    const conflicts = []

    for (const existing of existingBookings) {
      if (existing.status === BOOKING_STATUS.CANCELLED) continue
      if (existing.status === BOOKING_STATUS.COMPLETED) continue

      for (const item of (data.items || [])) {
        for (const existingItem of (existing.items || [])) {
          if (this.#itemsOverlap(item, existingItem)) {
            conflicts.push(existing)
          }
        }
      }
    }

    return conflicts
  }

  /**
   * Check if two booking items overlap
   * @private
   * @param {object} item1
   * @param {object} item2
   * @returns {boolean}
   */
  #itemsOverlap(item1, item2) {
    if (!item1.metadata?.date || !item2.metadata?.date) return false
    if (item1.metadata.date !== item2.metadata.date) return false

    if (item1.metadata.time && item2.metadata.time) {
      return item1.metadata.time === item2.metadata.time
    }

    return true
  }

  /**
   * Emit event via context eventBus
   * @private
   * @param {string} eventName
   * @param {object} data
   */
  #emit(eventName, data) {
    if (this.#context?.eventBus) {
      this.#context.eventBus.emit(eventName, data)
    }
  }
}

export default BookingManager
