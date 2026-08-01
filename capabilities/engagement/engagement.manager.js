/**
 * Engagement Manager — Orchestrates all engagement sub-modules
 *
 * Business-agnostic: coordinates triggers, campaigns, journeys, templates, analytics
 * No direct capability imports — uses context.capabilities.get()
 */
import { TriggerEngine } from './automation/trigger.engine.js'
import { CampaignManager } from './automation/campaign.manager.js'
import { JourneyManager } from './automation/journey.manager.js'
import { TemplateManager } from './messages/template.manager.js'
import { MessageBuilder } from './messages/message.builder.js'
import { EngagementAnalytics } from './analytics/engagement.analytics.js'
import { TRIGGER_TYPE } from './engagement.schema.js'
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

export class EngagementManager {
  #context = null
  #triggerEngine = null
  #campaignManager = null
  #journeyManager = null
  #templateManager = null
  #messageBuilder = null
  #analytics = null

  constructor(context) {
    this.#context = context
    this.#triggerEngine = new TriggerEngine(context)
    this.#campaignManager = new CampaignManager(context)
    this.#journeyManager = new JourneyManager(context)
    this.#templateManager = new TemplateManager(context)
    this.#messageBuilder = new MessageBuilder(context)
    this.#analytics = new EngagementAnalytics(context)
  }

  // ── Getters ──

  get triggers() { return this.#triggerEngine }
  get campaigns() { return this.#campaignManager }
  get journeys() { return this.#journeyManager }
  get templates() { return this.#templateManager }
  get builder() { return this.#messageBuilder }
  get analytics() { return this.#analytics }

  // ── Lifecycle ──

  init() {
    this.#registerDefaultTriggers()
    this.#subscribeToEvents()
  }

  // ── Event Processing ──

  /**
   * Process a system event through the trigger engine
   * @param {string} eventType
   * @param {object} eventData
   */
  processEvent(eventType, eventData) {
    this.#triggerEngine.processEvent(eventType, eventData)
  }

  /**
   * Handle reservation created
   * @param {object} reservation
   */
  async onReservationCreated(reservation) {
    const customerId = reservation.customer?.email || reservation.customer?.phone || `cust_${Date.now()}`
    const customerName = reservation.customer?.name || 'Customer'

    this.#journeyManager.onReservationCreated(customerId, customerName)
    this.#analytics.recordConversion('direct')

    this.#triggerEngine.processEvent(TRIGGER_TYPE.RESERVATION_CREATED, { reservation })

    await this.#messageBuilder.buildAndSend(
      'reservation_confirmation',
      customerId,
      { customer: reservation.customer, reservation },
    )
  }

  /**
   * Handle reservation confirmed
   * @param {object} reservation
   */
  async onReservationConfirmed(reservation) {
    const customerId = reservation.customer?.email || reservation.customer?.phone || `cust_${Date.now()}`
    this.#journeyManager.onReservationConfirmed(customerId)

    this.#triggerEngine.processEvent(TRIGGER_TYPE.RESERVATION_CONFIRMED, { reservation })

    await this.#messageBuilder.buildAndSend(
      'reservation_confirmed',
      customerId,
      { customer: reservation.customer, reservation },
    )
  }

  /**
   * Handle reservation cancelled
   * @param {object} reservation
   */
  async onReservationCancelled(reservation) {
    const customerId = reservation.customer?.email || reservation.customer?.phone || `cust_${Date.now()}`
    this.#triggerEngine.processEvent(TRIGGER_TYPE.RESERVATION_CANCELLED, { reservation })

    await this.#messageBuilder.buildAndSend(
      'reservation_cancelled',
      customerId,
      { customer: reservation.customer, reservation },
    )
  }

  /**
   * Handle reservation expired
   * @param {object} reservation
   */
  async onReservationExpired(reservation) {
    this.#triggerEngine.processEvent(TRIGGER_TYPE.RESERVATION_EXPIRED, { reservation })
  }

  /**
   * Request availability from owner
   * @param {object} options - { ownerId, channel, message }
   */
  async requestAvailability(options) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      await availability.requestAvailability(options)
      this.#analytics.recordAvailabilityRequested()

      this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.AVAILABILITY_REQUESTED, {
        ownerId: options.ownerId,
        channel: options.channel,
      })
    }
  }

  /**
   * Handle availability response
   * @param {string} requestId
   * @param {string} response
   */
  async processAvailabilityResponse(requestId, response) {
    const availability = this.#context?.capabilities?.get?.('availability')
    if (availability) {
      const result = await availability.processResponse(requestId, response)
      if (result.success) {
        this.#analytics.recordAvailabilityReceived()
        this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.AVAILABILITY_RECEIVED, {
          requestId,
          dates: result.dates,
        })
      }
      return result
    }
    return { success: false, error: 'Availability capability not available' }
  }

  /**
   * Detect opportunities from intelligence and act on them
   */
  async detectAndAct() {
    const intelligence = this.#context?.capabilities?.get?.('intelligence')
    if (!intelligence) return []

    const today = new Date()
    const end = new Date(today)
    end.setMonth(end.getMonth() + 1)
    const startDate = today.toISOString().split('T')[0]
    const endDate = end.toISOString().split('T')[0]

    const opportunities = intelligence.opportunityEngine?.findAll(startDate, endDate) || []

    for (const opp of opportunities) {
      this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.OPPORTUNITY_DETECTED, { opportunity: opp })

      if (opp.type === 'empty_period' && opp.days >= 7) {
        await this.requestAvailability({
          ownerId: opp.ownerId || 'owner',
          channel: 'whatsapp',
          message: `You have ${opp.days} empty days (${opp.startDate} to ${opp.endDate}). Do you have availability?`,
        })
      }
    }

    return opportunities
  }

  // ── Default Triggers ──

  #registerDefaultTriggers() {
    this.#triggerEngine.register({
      type: TRIGGER_TYPE.RESERVATION_CREATED,
      name: 'Send confirmation on reservation',
      config: { event: 'reservation:created' },
      action: { templateId: 'reservation_confirmation', channel: 'email' },
    })

    this.#triggerEngine.register({
      type: TRIGGER_TYPE.RESERVATION_CONFIRMED,
      name: 'Notify customer on confirmation',
      config: { event: 'reservation:confirmed' },
      action: { templateId: 'reservation_confirmed', channel: 'email' },
    })

    this.#triggerEngine.register({
      type: TRIGGER_TYPE.RESERVATION_CANCELLED,
      name: 'Notify customer on cancellation',
      config: { event: 'reservation:cancelled' },
      action: { templateId: 'reservation_cancelled', channel: 'email' },
    })

    this.#triggerEngine.register({
      type: TRIGGER_TYPE.RESERVATION_EXPIRED,
      name: 'Notify customer on expiration',
      config: { event: 'reservation:expired' },
      action: { templateId: 'reservation_expired', channel: 'email' },
    })

    this.#triggerEngine.register({
      type: TRIGGER_TYPE.LOW_DEMAND,
      name: 'Request availability on low demand',
      config: { threshold: 3 },
      action: { channel: 'whatsapp' },
    })
  }

  #subscribeToEvents() {
    const eventBus = this.#context?.eventBus
    if (!eventBus) return

    eventBus.on('reservation:created', (data) => {
      if (data.reservation) this.onReservationCreated(data.reservation)
    })

    eventBus.on('reservation:confirmed', (data) => {
      if (data.reservation) this.onReservationConfirmed(data.reservation)
    })

    eventBus.on('reservation:cancelled', (data) => {
      if (data.reservation) this.onReservationCancelled(data.reservation)
    })

    eventBus.on('reservation:expired', (data) => {
      if (data.reservation) this.onReservationExpired(data.reservation)
    })
  }
}
