/**
 * Engagement Capability — Customer Engagement & Notification Intelligence Layer
 *
 * Business-agnostic: orchestrates automated communication, availability requests,
 * reservation follow-up, customer lifecycle, campaigns
 * No direct capability imports — uses context.capabilities.get()
 */
import { BaseCapability } from '../core/base.capability.js'
import { EngagementManager } from './engagement.manager.js'
import { ENGAGEMENT_EVENTS } from './engagement.events.js'

export class EngagementCapability extends BaseCapability {
  static id = 'engagement'
  static name = 'Engagement'
  static version = '1.0.0'
  static dependencies = ['communication', 'availability', 'reservation', 'intelligence', 'notifications', 'scheduler', 'observability']

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new EngagementManager(context)
  }

  async activate() {
    this.#manager.init()
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    await super.destroy()
  }

  // ── Getters ──

  get manager() { return this.#manager }
  get triggers() { return this.#manager?.triggers }
  get campaigns() { return this.#manager?.campaigns }
  get journeys() { return this.#manager?.journeys }
  get templates() { return this.#manager?.templates }
  get builder() { return this.#manager?.builder }
  get analytics() { return this.#manager?.analytics }

  // ── Event Processing ──

  async onReservationCreated(reservation) {
    return this.#manager?.onReservationCreated(reservation)
  }

  async onReservationConfirmed(reservation) {
    return this.#manager?.onReservationConfirmed(reservation)
  }

  async onReservationCancelled(reservation) {
    return this.#manager?.onReservationCancelled(reservation)
  }

  async onReservationExpired(reservation) {
    return this.#manager?.onReservationExpired(reservation)
  }

  // ── Availability ──

  async requestAvailability(options) {
    return this.#manager?.requestAvailability(options)
  }

  async processAvailabilityResponse(requestId, response) {
    return this.#manager?.processAvailabilityResponse(requestId, response) || { success: false }
  }

  // ── Intelligence ──

  async detectAndAct() {
    return this.#manager?.detectAndAct() || []
  }

  // ── Triggers ──

  registerTrigger(triggerDef) {
    return this.#manager?.triggers?.register(triggerDef) || { success: false }
  }

  getActiveTriggers() {
    return this.#manager?.triggers?.getActive() || []
  }

  // ── Campaigns ──

  createCampaign(data) {
    return this.#manager?.campaigns?.create(data) || { success: false }
  }

  async startCampaign(campaignId) {
    return this.#manager?.campaigns?.start(campaignId) || { success: false }
  }

  pauseCampaign(campaignId) {
    this.#manager?.campaigns?.pause(campaignId)
  }

  getCampaigns() {
    return this.#manager?.campaigns?.getAll() || []
  }

  // ── Journeys ──

  getCustomerJourney(customerId) {
    return this.#manager?.journeys?.getById(customerId) || null
  }

  getAllJourneys() {
    return this.#manager?.journeys?.getAll() || []
  }

  // ── Templates ──

  createTemplate(data) {
    return this.#manager?.templates?.create(data) || { success: false }
  }

  getTemplates() {
    return this.#manager?.templates?.getAll() || []
  }

  renderTemplate(templateId, variables) {
    return this.#manager?.templates?.render(templateId, variables) || null
  }

  // ── Messages ──

  async sendMessage(templateId, recipient, variables = {}, options = {}) {
    return this.#manager?.builder?.buildAndSend(templateId, recipient, variables, options) || { success: false }
  }

  // ── Analytics ──

  getEngagementMetrics() {
    return this.#manager?.analytics?.getSummary() || {}
  }

  getMetrics() {
    return this.#manager?.analytics?.getAll() || []
  }
}

export default EngagementCapability
