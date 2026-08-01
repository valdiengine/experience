/**
 * Business Services — Orchestrator
 *
 * Central access point for all business services
 * Consumes capabilities through context — never imports them directly
 * Business-agnostic: all services are generic domain operations
 */
import { ReservationService } from './reservation.service.js'
import { PaymentService } from './payment.service.js'
import { NotificationService } from './notification.service.js'
import { UserService } from './user.service.js'
import { AnalyticsService } from './analytics.service.js'

export class BusinessServices {
  #capabilities = null
  #reservation = null
  #payment = null
  #notification = null
  #user = null
  #analytics = null

  constructor(capabilities) {
    this.#capabilities = capabilities
    this.#reservation = new ReservationService(capabilities)
    this.#payment = new PaymentService(capabilities)
    this.#notification = new NotificationService(capabilities)
    this.#user = new UserService(capabilities)
    this.#analytics = new AnalyticsService(capabilities)
  }

  get reservation() { return this.#reservation }
  get payment() { return this.#payment }
  get notification() { return this.#notification }
  get user() { return this.#user }
  get analytics() { return this.#analytics }

  /**
   * Initialize all services with current capabilities
   */
  init() {
    // Services are initialized on construction with capabilities reference
    // This method exists for explicit lifecycle management
  }

  /**
   * Get service by name
   * @param {string} name - Service name (reservation, payment, notification, user, analytics)
   * @returns {object|null}
   */
  get(name) {
    switch (name) {
      case 'reservation': return this.#reservation
      case 'payment': return this.#payment
      case 'notification': return this.#notification
      case 'user': return this.#user
      case 'analytics': return this.#analytics
      default: return null
    }
  }
}
