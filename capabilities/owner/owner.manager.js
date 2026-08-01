/**
 * Owner Manager — Orchestrates owner portal operations
 *
 * Business-agnostic: coordinates reservation, availability, communication, observability
 * No business logic — only UI-level orchestration
 * Uses capabilities through context.capabilities.get()
 */
import { OWNER_EVENTS } from './owner.events.js'

export class OwnerManager {
  #context = null
  #ownerId = null

  constructor(context) {
    this.#context = context
  }

  // ── Initialization ──

  init(ownerId) {
    this.#ownerId = ownerId
    this.#emit(OWNER_EVENTS.OWNER_PROFILE_LOADED, { ownerId })
  }

  // ── Dashboard ──

  async getDashboardData() {
    const tenantId = this.#context?.tenant?.id
    const reservations = this.#getReservationStats(tenantId)
    const availability = this.#getAvailabilitySummary(tenantId)
    const customers = this.#getCustomerStats(tenantId)
    const metrics = this.#getMetricsData(tenantId)
    const conversations = this.#getConversationStats(tenantId)

    return {
      reservations,
      availability,
      customers,
      metrics,
      conversations,
      timestamp: new Date().toISOString(),
    }
  }

  #getReservationStats(tenantId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return { total: 0, pending: 0, confirmed: 0, cancelled: 0 }

    const all = reservation.getAll() || []
    return {
      total: all.length,
      pending: all.filter(r => r.status === 'requested' || r.status === 'owner_pending').length,
      confirmed: all.filter(r => r.status === 'confirmed').length,
      cancelled: all.filter(r => r.status === 'cancelled').length,
      expired: all.filter(r => r.status === 'expired').length,
      recent: all.slice(-5).reverse(),
    }
  }

  #getAvailabilitySummary(tenantId) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability) return { total: 0, available: 0, blocked: 0 }

    const today = new Date()
    const end = new Date(today)
    end.setMonth(end.getMonth() + 1)
    const startDate = today.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const dates = availability.getAvailability(startDate, endDate) || []
    return {
      total: dates.length,
      available: dates.filter(d => d.status === 'available').length,
      blocked: dates.filter(d => d.status === 'blocked').length,
      dates,
    }
  }

  #getCustomerStats(tenantId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return { total: 0 }

    const all = reservation.getAll() || []
    const customerMap = new Map()
    for (const r of all) {
      if (r.customer?.name) {
        customerMap.set(r.customer.name, {
          name: r.customer.name,
          email: r.customer.email || '',
          phone: r.customer.phone || '',
          country: r.customer.country || '',
          reservationCount: (customerMap.get(r.customer.name)?.reservationCount || 0) + 1,
          lastReservation: r.createdAt,
        })
      }
    }

    return {
      total: customerMap.size,
      customers: Array.from(customerMap.values()),
    }
  }

  #getMetricsData(tenantId) {
    const observability = this.#context?.capabilities?.get?.('observability')
    if (!observability) return {}

    return observability.getMetricsSummary(tenantId) || {}
  }

  #getConversationStats(tenantId) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return { total: 0, channels: [] }

    const channels = communication.getChannels() || []
    const messages = communication.getMessages() || []

    return {
      total: messages.length,
      channels,
      recent: messages.slice(-10).reverse(),
    }
  }

  // ── Reservations ──

  async getReservations(status) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    if (status) {
      return reservation.getByStatus(status) || []
    }
    return reservation.getAll() || []
  }

  async getReservationById(reservationId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return null

    this.#emit(OWNER_EVENTS.RESERVATION_VIEWED, { reservationId })
    return reservation.getById(reservationId) || null
  }

  async confirmReservation(reservationId) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return { success: false, errors: ['Reservation capability not available'] }

    const result = await reservation.confirmReservation(reservationId)
    if (result.success) {
      this.#emit(OWNER_EVENTS.RESERVATION_CONFIRMED, { reservationId })
    }
    return result
  }

  async rejectReservation(reservationId, reason) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return { success: false, errors: ['Reservation capability not available'] }

    const result = await reservation.rejectReservation(reservationId, reason)
    if (result.success) {
      this.#emit(OWNER_EVENTS.RESERVATION_REJECTED, { reservationId, reason })
    }
    return result
  }

  async cancelReservation(reservationId, reason) {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return { success: false, errors: ['Reservation capability not available'] }

    const result = await reservation.cancelReservation(reservationId, reason)
    if (result.success) {
      this.#emit(OWNER_EVENTS.RESERVATION_CANCELLED, { reservationId, reason })
    }
    return result
  }

  // ── Availability ──

  async blockDates(dates, notes) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability) return { success: false, errors: ['Availability capability not available'] }

    const results = []
    for (const date of dates) {
      const result = await availability.processResponse('owner_block', `${date}: blocked ${notes || ''}`)
      results.push(result)
    }

    this.#emit(OWNER_EVENTS.AVAILABILITY_BLOCKED, { dates, notes })
    return { success: true, results }
  }

  async openDates(dates, notes) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability) return { success: false, errors: ['Availability capability not available'] }

    const results = []
    for (const date of dates) {
      const result = await availability.processResponse('owner_open', `${date}: available ${notes || ''}`)
      results.push(result)
    }

    this.#emit(OWNER_EVENTS.AVAILABILITY_OPENED, { dates, notes })
    return { success: true, results }
  }

  async writeAvailabilityNaturalLanguage(text) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability) return { success: false, errors: ['Availability capability not available'] }

    const result = await availability.processResponse('owner_write', text)
    if (result.success) {
      this.#emit(OWNER_EVENTS.AVAILABILITY_UPDATED, { text, dates: result.dates })
    }
    return result
  }

  async getAvailability(startDate, endDate) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (!availability) return []
    return availability.getAvailability(startDate, endDate) || []
  }

  // ── Customers ──

  getCustomers() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const customerMap = new Map()
    for (const r of all) {
      if (r.customer?.name) {
        const existing = customerMap.get(r.customer.name)
        customerMap.set(r.customer.name, {
          name: r.customer.name,
          email: r.customer.email || '',
          phone: r.customer.phone || '',
          country: r.customer.country || '',
          notes: r.customer.notes || existing?.notes || '',
          reservationCount: (existing?.reservationCount || 0) + 1,
          lastReservation: r.createdAt,
        })
      }
    }

    return Array.from(customerMap.values())
  }

  addCustomerNote(customerName, notes) {
    this.#emit(OWNER_EVENTS.CUSTOMER_NOTED, { customerName, notes })
    return { success: true }
  }

  // ── Communication ──

  async sendMessage(channel, recipient, body, subject) {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return { success: false, errors: ['Communication capability not available'] }

    const result = await communication.send({ channel, recipient, body, subject })
    if (result.success) {
      this.#emit(OWNER_EVENTS.MESSAGE_SENT, { channel, recipient })
    }
    return result
  }

  getConversations() {
    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) return []

    return communication.getMessages() || []
  }

  // ── Metrics ──

  getMetrics() {
    const observability = this.#context?.capabilities?.get?.('observability')
    if (!observability) return {}

    const tenantId = this.#context?.tenant?.id
    return observability.getMetricsSummary(tenantId) || {}
  }

  getActiveAlerts() {
    const observability = this.#context?.capabilities?.get?.('observability')
    if (!observability) return []

    const tenantId = this.#context?.tenant?.id
    return observability.getActiveAlerts(tenantId) || []
  }

  // ── Private Methods ──

  #emit(event, data) {
    this.#context?.eventBus?.emit(event, data)
  }
}
