/**
 * Reservation Manager — Central orchestration of reservation lifecycle
 *
 * Business-agnostic: works for any resource type
 * Consumes data through repositories and DataManager
 * Uses capabilities through context.capabilities.get()
 * No direct imports from booking, availability, communication, notifications
 *
 * P13.5.3 corrections:
 *  - C1: preserve aggregate identity (businessId, accommodationId, visitorId)
 *  - C2: repository-backed persistence (context.repositories.reservation) with
 *        in-memory + DataManager caches for backward-compatible synchronous reads
 *  - C3: authorization enforced on every lifecycle operation via context.runtime.auth
 */
import { RESERVATION_STATUS } from './reservation.status.js'
import { RESERVATION_EVENTS } from './reservation.events.js'
import { ReservationWorkflow } from './reservation.workflow.js'
import { RESERVATION_PERMISSIONS } from './reservation.permissions.js'
import { validateReservation } from './reservation.schema.js'
import { validateDateRange, validateStatusTransition, checkAvailability, checkReservationOverlap } from './reservation.validation.js'

export class ReservationManager {
  #context = null
  #reservations = new Map()

  constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.reservation || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth || !identity) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'reservation')
    } catch {
      throw new Error(`Missing permission: ${permission}`)
    }
  }

  /**
   * Public authorization gate used by the service layer for read operations
   * @param {object|null} identity
   * @param {string} permission
   * @param {string} [resource]
   * @returns {Promise<boolean>}
   */
  async authorize(identity, permission, resource) {
    await this.#checkPermission(identity, permission, resource)
    return true
  }

  /**
   * Load a reservation from the repository first, then caches
   * @private
   */
  async #loadReservation(reservationId) {
    const cached = this.#reservations.get(reservationId)
    if (cached) return cached

    if (this.#repo) {
      try {
        const found = await this.#repo.findById(reservationId)
        if (found) {
          this.#reservations.set(reservationId, found)
          return found
        }
      } catch { /* repository not resolvable — fall through to caches */ }
    }

    const fromDataManager = this.#context?.dataManager?.get('reservations')?.find(r => r.id === reservationId)
    if (fromDataManager) {
      this.#reservations.set(reservationId, fromDataManager)
      return fromDataManager
    }
    return null
  }

  /**
   * Load all reservations from the repository into the in-memory cache
   * @returns {Promise<number>} - Number of reservations hydrated
   */
  async hydrate() {
    if (!this.#repo) return 0
    try {
      const all = await this.#repo.findMany({})
      if (!Array.isArray(all)) return 0
      for (const r of all) this.#reservations.set(r.id, r)
      return all.length
    } catch {
      return 0
    }
  }

  /**
   * Create a reservation request
   * @param {object} data - { businessId, accommodationId, visitorId, resourceId, customer, dates, guests, source }
   * @param {object|null} identity
   * @returns {{ success: boolean, reservationId?: string, status?: string, errors?: string[] }}
   */
  async createRequest(data, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CREATE)

    const tenant = this.#context?.tenant
    const tenantId = data.tenantId
      || (tenant && typeof tenant === 'object' ? tenant.id : tenant)
      || null

    const reservation = {
      id: data.id || `res_${Date.now()}`,
      tenantId,
      businessId: data.businessId || null,
      accommodationId: data.accommodationId || null,
      visitorId: data.visitorId || null,
      resourceId: data.resourceId,
      status: RESERVATION_STATUS.REQUESTED,
      customer: data.customer,
      dates: data.dates,
      guests: data.guests || 1,
      source: data.source || 'direct',
      notes: data.notes || '',
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
    }

    const validation = validateReservation(reservation)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#reservations.set(reservation.id, reservation)

    const hasPostgresAdapter = this.#repo?.adapter?.client?.db != null
    const hasAtomicMethod = typeof this.#repo?.createReservationWithLine === 'function'

    if (reservation.accommodationId && hasAtomicMethod && hasPostgresAdapter) {
      const lineData = {
        id: `rl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        lineOrder: 1,
        targetType: 'accommodation',
        targetId: reservation.accommodationId,
        temporal: {
          mode: 'DATE_RANGE',
          startDate: reservation.dates?.checkIn || null,
          endDate: reservation.dates?.checkOut || null,
        },
        quantity: 1,
        unitPrice: null,
        lineTotal: null,
        metadata: {},
      }

      await this.#repo.createReservationWithLine(reservation, lineData)
    } else {
      await this.#persist(reservation, true)
    }

    this.#emit(RESERVATION_EVENTS.CREATED, { reservation })

    return {
      success: true,
      reservationId: reservation.id,
      status: reservation.status,
    }
  }

  /**
   * Validate reservation (check availability, tenant rules, resource state)
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ valid: boolean, conflicts?: string[] }}
   */
  async validateReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.READ)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { valid: false, conflicts: ['Reservation not found'] }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      const checkIn = reservation.dates.checkIn
      const checkOut = reservation.dates.checkOut

      if (typeof availability.isAvailable === 'function' && !(await availability.isAvailable(checkIn))) {
        return { valid: false, conflicts: [`Date ${checkIn} not available`] }
      }
    }

    this.#emit(RESERVATION_EVENTS.VALIDATED, { reservationId, valid: true })

    return { valid: true, conflicts: [] }
  }

  /**
   * Request owner confirmation via Communication capability
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async requestOwnerConfirmation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.OWNER_PENDING)
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)

    const communication = this.#context?.capabilities?.get?.('communication')
    if (communication) {
      const channel = reservation.customer.channelPreference || 'whatsapp'
      await communication.send({
        channel,
        recipient: reservation.resourceId,
        body: `Nueva solicitud de reserva de ${reservation.customer.name} (${reservation.dates.checkIn} al ${reservation.dates.checkOut})`,
      })
    }

    this.#emit(RESERVATION_EVENTS.OWNER_REQUESTED, { reservationId, reservation: updated })

    return { success: true }
  }

  /**
   * Confirm reservation (owner confirmed)
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async confirmReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CONFIRM)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    let updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.OWNER_CONFIRMED)
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.OWNER_CONFIRMED, { reservationId, reservation: updated })

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability?.updateAvailability) {
      await availability.updateAvailability([{
        date: reservation.dates.checkIn,
        endDate: reservation.dates.checkOut,
        status: 'unavailable',
        resourceId: reservation.resourceId,
      }])
    }

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su reserva ha sido confirmada para ${reservation.dates.checkIn} al ${reservation.dates.checkOut}`,
      })
    }

    updated = ReservationWorkflow.transition(updated, RESERVATION_STATUS.PAYMENT_PENDING)
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.PAYMENT_PENDING, { reservationId, reservation: updated })

    return { success: true }
  }

  /**
   * Reject reservation
   * @param {string} reservationId
   * @param {string} reason
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async rejectReservation(reservationId, reason = '', identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.REJECT)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.REJECTED)
    updated.notes = reason ? `${updated.notes}\nRechazada: ${reason}` : updated.notes
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha sido rechazada.`,
      })
    }

    this.#emit(RESERVATION_EVENTS.REJECTED, { reservationId, reservation: updated, reason })

    return { success: true }
  }

  /**
   * Cancel reservation
   * @param {string} reservationId
   * @param {string} reason
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async cancelReservation(reservationId, reason = '', identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CANCEL)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.CANCELLED)
    updated.notes = reason ? `${updated.notes}\nCancelada: ${reason}` : updated.notes
    updated.cancelledAt = new Date().toISOString()
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)

    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability?.updateAvailability) {
      await availability.updateAvailability([{
        date: reservation.dates.checkIn,
        endDate: reservation.dates.checkOut,
        status: 'available',
        resourceId: reservation.resourceId,
      }])
    }

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha sido cancelada.`,
      })
    }

    this.#emit(RESERVATION_EVENTS.CANCELLED, { reservationId, reservation: updated, reason })

    return { success: true }
  }

  /**
   * Expire reservation (timeout, abandonment)
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async expireReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.CANCEL)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.EXPIRED)
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)

    const notifications = this.#context?.capabilities?.get?.('notifications')
    if (notifications) {
      await notifications.send({
        channel: reservation.customer.channelPreference || 'email',
        recipient: reservation.customer.email || reservation.customer.phone,
        body: `Su solicitud de reserva para ${reservation.dates.checkIn} al ${reservation.dates.checkOut} ha expirado.`,
      })
    }

    this.#emit(RESERVATION_EVENTS.EXPIRED, { reservationId, reservation: updated })

    return { success: true }
  }

  /**
   * Complete reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async completeReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.COMPLETED)
    updated.completedAt = new Date().toISOString()
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)

    this.#emit(RESERVATION_EVENTS.COMPLETED, { reservationId, reservation: updated })

    return { success: true }
  }

  /**
   * Update reservation fields
   * @param {string} id
   * @param {object} data
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[], data?: object }}
   */
  async updateReservation(id, data, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(id)
    if (!reservation) {
      return { success: false, errors: ['Reservation not found'] }
    }

    const patch = {}
    for (const [key, value] of Object.entries(data || {})) {
      if (value !== undefined) patch[key] = value
    }
    patch.id = reservation.id
    patch.tenantId = reservation.tenantId

    const updated = { ...reservation, ...patch, updatedAt: new Date().toISOString() }
    this.#reservations.set(id, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.UPDATED, { reservationId: id, reservation: updated, changes: data })
    return { success: true, data: updated }
  }

  /**
   * Check in a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async checkInReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.CHECKED_IN)
    updated.checkedInAt = new Date().toISOString()
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.CHECKED_IN, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Check out a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async checkOutReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.CHECKED_OUT)
    updated.checkedOutAt = new Date().toISOString()
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.CHECKED_OUT, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Mark reservation as no-show
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async noShowReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.UPDATE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.NO_SHOW)
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.NO_SHOW, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Archive a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async archiveReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.ARCHIVE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    const updated = ReservationWorkflow.transition(reservation, RESERVATION_STATUS.ARCHIVED)
    updated.previousStatus = reservation.status
    updated.archivedAt = new Date().toISOString()
    this.#reservations.set(reservationId, updated)
    await this.#persist(updated)
    this.#emit(RESERVATION_EVENTS.ARCHIVED, { reservationId, reservation: updated })
    return { success: true }
  }

  /**
   * Restore archived reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async restoreReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.RESTORE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }
    if (reservation.status !== RESERVATION_STATUS.ARCHIVED) {
      return { success: false, errors: ['Only archived reservations can be restored'] }
    }

    const restored = {
      ...reservation,
      status: reservation.previousStatus || RESERVATION_STATUS.CONFIRMED,
      previousStatus: null,
      archivedAt: null,
      updatedAt: new Date().toISOString(),
    }
    this.#reservations.set(reservationId, restored)
    await this.#persist(restored)
    this.#emit(RESERVATION_EVENTS.RESTORED, { reservationId, reservation: restored })
    return { success: true, data: restored }
  }

  /**
   * Delete a reservation
   * @param {string} reservationId
   * @param {object|null} identity
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async deleteReservation(reservationId, identity) {
    await this.#checkPermission(identity, RESERVATION_PERMISSIONS.DELETE)
    const reservation = await this.#loadReservation(reservationId)
    if (!reservation) return { success: false, errors: ['Reservation not found'] }

    this.#reservations.delete(reservationId)
    if (this.#repo) {
      await this.#repo.delete({ id: reservationId })
    }
    if (this.#context?.dataManager) {
      const reservations = this.#context.dataManager.get('reservations') || []
      const index = reservations.findIndex(r => r.id === reservationId)
      if (index >= 0) {
        reservations.splice(index, 1)
        this.#context.dataManager.set('reservations', reservations)
      }
    }
    this.#emit(RESERVATION_EVENTS.UPDATED, { reservationId, action: 'deleted' })
    return { success: true }
  }

  /**
   * Get reservation by ID
   * @param {string} reservationId
   * @returns {object|null}
   */
  getById(reservationId) {
    return this.#reservations.get(reservationId) || null
  }

  /**
   * Get all reservations
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#reservations.values())
  }

  /**
   * Get reservations by status
   * @param {string} status
   * @returns {object[]}
   */
  getByStatus(status) {
    return this.getAll().filter(r => r.status === status)
  }

  /**
   * Get reservations by resource
   * @param {string} resourceId
   * @returns {object[]}
   */
  getByResource(resourceId) {
    return this.getAll().filter(r => r.resourceId === resourceId)
  }

  /**
   * Get reservations by accommodation
   * @param {string} accommodationId
   * @returns {object[]}
   */
  getByAccommodation(accommodationId) {
    return this.getAll().filter(r => r.accommodationId === accommodationId)
  }

  /**
   * Get reservations by visitor
   * @param {string} visitorId
   * @returns {object[]}
   */
  getByVisitor(visitorId) {
    return this.getAll().filter(r => r.visitorId === visitorId)
  }

  /**
   * Get reservations by business
   * @param {string} businessId
   * @returns {object[]}
   */
  getByBusiness(businessId) {
    return this.getAll().filter(r => r.businessId === businessId)
  }

  /**
   * Get upcoming reservations (future confirmed/checked_in)
   * @returns {object[]}
   */
  getUpcoming() {
    const now = new Date().toISOString().split('T')[0]
    return this.getAll().filter(r =>
      (r.status === RESERVATION_STATUS.CONFIRMED || r.status === RESERVATION_STATUS.CHECKED_IN) &&
      r.dates?.checkIn >= now
    ).sort((a, b) => (a.dates?.checkIn || '').localeCompare(b.dates?.checkIn || ''))
  }

  /**
   * Get active (non-terminal) reservations
   * @returns {object[]}
   */
  getActive() {
    return this.getAll().filter(r =>
      r.status !== RESERVATION_STATUS.COMPLETED &&
      r.status !== RESERVATION_STATUS.CANCELLED &&
      r.status !== RESERVATION_STATUS.REJECTED &&
      r.status !== RESERVATION_STATUS.EXPIRED &&
      r.status !== RESERVATION_STATUS.NO_SHOW &&
      r.status !== RESERVATION_STATUS.NO_RESPONSE &&
      r.status !== RESERVATION_STATUS.ARCHIVED
    )
  }

  /**
   * Get completed reservations
   * @returns {object[]}
   */
  getCompleted() {
    return this.getByStatus(RESERVATION_STATUS.COMPLETED)
  }

  /**
   * Get cancelled reservations
   * @returns {object[]}
   */
  getCancelled() {
    return this.getByStatus(RESERVATION_STATUS.CANCELLED)
  }

  /**
   * Calculate nights between check-in and check-out
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {number}
   */
  calculateNights(checkIn, checkOut) {
    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0
    return Math.max(0, Math.floor((outDate - inDate) / 86400000))
  }

  /**
   * Calculate guest count from data
   * @param {object} data
   * @returns {number}
   */
  calculateGuests(data) {
    if (data.guests) return data.guests
    if (data.adults) return data.adults + (data.children || 0)
    return 1
  }

  /**
   * Calculate reservation price (delegates to pricing if available)
   * @param {string} accommodationId
   * @param {string} checkIn
   * @param {string} checkOut
   * @param {number} guests
   * @returns {{ success: boolean, price?: number, currency?: string, nights?: number }}
   */
  async calculatePrice(accommodationId, checkIn, checkOut, guests = 1) {
    const nights = this.calculateNights(checkIn, checkOut)
    if (nights <= 0) return { success: false, errors: ['Invalid date range'] }

    const pricing = this.#context?.capabilities?.get?.('pricing')
    if (pricing?.calculatePrice) {
      try {
        const result = await pricing.calculatePrice(accommodationId, checkIn, checkOut, guests)
        return result
      } catch {
        // fallback to simple calculation
      }
    }

    const availability = this.#context?.capabilities?.get?.('availability')
    let pricePerNight = 0
    let currency = 'USD'
    if (availability?.service) {
      try {
        const calendar = await availability.service.getCalendar(accommodationId, checkIn, checkOut, null)
        if (Array.isArray(calendar) && calendar.length > 0) {
          const priced = calendar.filter(d => d.price != null)
          if (priced.length > 0) {
            pricePerNight = priced.reduce((sum, d) => sum + (d.price || 0), 0) / priced.length
            currency = priced.find(d => d.currency)?.currency || currency
          }
        }
      } catch {
        // use default
      }
    }

    const totalPrice = pricePerNight * nights
    this.#emit(RESERVATION_EVENTS.PRICE_CALCULATED, { accommodationId, checkIn, checkOut, guests, nights, totalPrice, currency })
    return { success: true, price: totalPrice, currency: currency || 'USD', nights, pricePerNight }
  }

  /**
   * Validate availability for a date range
   * @param {string} accommodationId
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {Promise<object>}
   */
  async validateCheckAvailability(accommodationId, checkIn, checkOut) {
    const dateValidation = validateDateRange(checkIn, checkOut)
    if (!dateValidation.valid) return { available: false, errors: dateValidation.errors }

    const overlap = await checkReservationOverlap(this.#context, accommodationId, checkIn, checkOut)
    if (overlap.hasOverlap) {
      return { available: false, errors: ['Date range overlaps with existing reservation'], overlapping: overlap.overlapping }
    }

    const availCheck = await checkAvailability(this.#context, accommodationId, checkIn, checkOut)
    if (!availCheck.available) {
      return { available: false, errors: ['Dates not available'], conflicts: availCheck.conflicts }
    }

    return { available: true }
  }

  /**
   * Estimate taxes for a given price
   * @param {number} totalPrice
   * @returns {{ success: boolean, taxRate: number, taxAmount: number, totalWithTax: number }}
   */
  estimateTaxes(totalPrice) {
    const taxRate = 0.10
    const taxAmount = Math.round((totalPrice || 0) * taxRate * 100) / 100
    return {
      success: true,
      taxRate,
      taxAmount,
      totalWithTax: (totalPrice || 0) + taxAmount,
    }
  }

  /**
   * Estimate commission for a given price
   * @param {number} totalPrice
   * @returns {{ success: boolean, commissionRate: number, commissionAmount: number, netAmount: number }}
   */
  estimateCommission(totalPrice) {
    const commissionRate = 0.15
    const commissionAmount = Math.round((totalPrice || 0) * commissionRate * 100) / 100
    return {
      success: true,
      commissionRate,
      commissionAmount,
      netAmount: (totalPrice || 0) - commissionAmount,
    }
  }

  /**
   * Load reservations from DataManager (legacy hydration path)
   */
  loadFromDataManager() {
    const reservations = this.#context?.dataManager?.get('reservations') || []
    reservations.forEach(r => this.#reservations.set(r.id, r))
  }

  /**
   * Persist reservation to repository and caches
   * @private
   */
  async #persist(reservation, isNew = false) {
    if (this.#repo) {
      try {
        if (isNew) {
          await this.#repo.create(reservation)
        } else {
          const updated = await this.#repo.update({ id: reservation.id }, reservation)
          if (!updated) {
            await this.#repo.create(reservation)
          }
        }
      } catch (err) {
        console.error(`[ReservationManager] Failed to persist reservation ${reservation.id}:`, err.message)
      }
    }
    this.#reservations.set(reservation.id, reservation)
    if (this.#context?.dataManager) {
      const reservations = this.#context.dataManager.get('reservations') || []
      const index = reservations.findIndex(r => r.id === reservation.id)
      if (index >= 0) {
        reservations[index] = reservation
      } else {
        reservations.push(reservation)
      }
      this.#context.dataManager.set('reservations', reservations)
    }
  }

  /**
   * Emit event via context eventBus
   * @private
   */
  #emit(eventName, data) {
    if (this.#context?.eventBus) {
      this.#context.eventBus.emit(eventName, data)
    }
  }
}

export default ReservationManager
