/**
 * Campaign Manager — Tenant campaign management
 *
 * Business-agnostic: seasonal, low demand, customer recovery, availability campaigns
 * No direct capability imports — uses context.capabilities.get()
 */
import { CAMPAIGN_STATUS, CAMPAIGN_TYPE, validateCampaign } from '../engagement.schema.js'
import { ENGAGEMENT_EVENTS } from '../engagement.events.js'

export class CampaignManager {
  #context = null
  #campaigns = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Create a campaign
   * @param {object} data - { name, type, config }
   * @returns {{ success: boolean, campaign?: object, errors?: string[] }}
   */
  create(data) {
    const campaign = {
      id: data.id || `campaign_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      name: data.name,
      type: data.type,
      status: CAMPAIGN_STATUS.DRAFT,
      config: data.config || {},
      stats: { sent: 0, opened: 0, responded: 0, converted: 0 },
      createdAt: new Date().toISOString(),
    }

    const validation = validateCampaign(campaign)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#campaigns.set(campaign.id, campaign)
    this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.CAMPAIGN_CREATED, { campaign })
    return { success: true, campaign }
  }

  /**
   * Start a campaign
   * @param {string} campaignId
   * @returns {{ success: boolean, errors?: string[] }}
   */
  async start(campaignId) {
    const campaign = this.#campaigns.get(campaignId)
    if (!campaign) return { success: false, errors: ['Campaign not found'] }

    campaign.status = CAMPAIGN_STATUS.ACTIVE
    campaign.startedAt = new Date().toISOString()

    this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.CAMPAIGN_STARTED, { campaignId })

    await this.#executeCampaign(campaign)

    return { success: true }
  }

  /**
   * Pause a campaign
   * @param {string} campaignId
   */
  pause(campaignId) {
    const campaign = this.#campaigns.get(campaignId)
    if (campaign) {
      campaign.status = CAMPAIGN_STATUS.PAUSED
      this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.CAMPAIGN_PAUSED, { campaignId })
    }
  }

  /**
   * Complete a campaign
   * @param {string} campaignId
   */
  complete(campaignId) {
    const campaign = this.#campaigns.get(campaignId)
    if (campaign) {
      campaign.status = CAMPAIGN_STATUS.COMPLETED
      campaign.completedAt = new Date().toISOString()
      this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.CAMPAIGN_COMPLETED, { campaignId })
    }
  }

  /**
   * Get all campaigns
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#campaigns.values())
  }

  /**
   * Get active campaigns
   * @returns {object[]}
   */
  getActive() {
    return Array.from(this.#campaigns.values()).filter(c => c.status === CAMPAIGN_STATUS.ACTIVE)
  }

  /**
   * Get campaign by ID
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    return this.#campaigns.get(id) || null
  }

  /**
   * Update campaign stats
   * @param {string} campaignId
   * @param {object} stats - { sent?, opened?, responded?, converted? }
   */
  updateStats(campaignId, stats) {
    const campaign = this.#campaigns.get(campaignId)
    if (campaign) {
      if (stats.sent) campaign.stats.sent += stats.sent
      if (stats.opened) campaign.stats.opened += stats.opened
      if (stats.responded) campaign.stats.responded += stats.responded
      if (stats.converted) campaign.stats.converted += stats.converted
    }
  }

  /**
   * Remove campaign
   * @param {string} campaignId
   */
  remove(campaignId) {
    this.#campaigns.delete(campaignId)
  }

  // ── Campaign Execution ──

  async #executeCampaign(campaign) {
    const communication = this.#context?.capabilities?.get?.('communication')
    const availability = this.#context?.capabilities?.get?.('availability')

    switch (campaign.type) {
      case CAMPAIGN_TYPE.SEASONAL:
        await this.#executeSeasonal(campaign, communication)
        break
      case CAMPAIGN_TYPE.LOW_DEMAND:
        await this.#executeLowDemand(campaign, communication, availability)
        break
      case CAMPAIGN_TYPE.CUSTOMER_RECOVERY:
        await this.#executeCustomerRecovery(campaign, communication)
        break
      case CAMPAIGN_TYPE.AVAILABILITY:
        await this.#executeAvailability(campaign, communication, availability)
        break
      case CAMPAIGN_TYPE.CUSTOM:
        await this.#executeCustom(campaign, communication)
        break
    }
  }

  async #executeSeasonal(campaign, communication) {
    const customers = this.#getCustomers()
    const template = campaign.config.template || 'seasonal_availability'

    for (const customer of customers) {
      if (communication) {
        await communication.send({
          channel: campaign.config.channel || 'email',
          recipient: customer.email || customer.phone,
          body: `Hello ${customer.name}, we have availability for the upcoming season!`,
          campaignId: campaign.id,
        })
        this.updateStats(campaign.id, { sent: 1 })
      }
    }
  }

  async #executeLowDemand(campaign, communication, availability) {
    const intelligence = this.#context?.capabilities?.get?.('intelligence')
    if (intelligence) {
      const today = new Date()
      const end = new Date(today)
      end.setMonth(end.getMonth() + 1)
      const startDate = today.toISOString().split('T')[0]
      const endDate = end.toISOString().split('T')[0]

      const opportunities = intelligence.opportunityEngine?.findAll(startDate, endDate) || []
      for (const opp of opportunities) {
        if (communication && opp.type === 'empty_period') {
          await communication.send({
            channel: campaign.config.channel || 'email',
            recipient: campaign.config.ownerEmail,
            body: `You have ${opp.days} empty days coming up. Consider a promotion!`,
            campaignId: campaign.id,
          })
          this.updateStats(campaign.id, { sent: 1 })
        }
      }
    }
  }

  async #executeCustomerRecovery(campaign, communication) {
    const customers = this.#getInactiveCustomers()
    for (const customer of customers) {
      if (communication) {
        await communication.send({
          channel: campaign.config.channel || 'email',
          recipient: customer.email || customer.phone,
          body: `We miss you, ${customer.name}! Come back and check our availability.`,
          campaignId: campaign.id,
        })
        this.updateStats(campaign.id, { sent: 1 })
      }
    }
  }

  async #executeAvailability(campaign, communication, availability) {
    if (availability) {
      await availability.requestAvailability({
        ownerId: campaign.config.ownerId,
        channel: campaign.config.channel || 'whatsapp',
        message: campaign.config.message || 'Do you have availability for the coming weeks?',
      })
      this.updateStats(campaign.id, { sent: 1 })
    }
  }

  async #executeCustom(campaign, communication) {
    const customers = this.#getCustomers()
    for (const customer of customers) {
      if (communication) {
        await communication.send({
          channel: campaign.config.channel || 'email',
          recipient: customer.email || customer.phone,
          body: campaign.config.message || '',
          campaignId: campaign.id,
        })
        this.updateStats(campaign.id, { sent: 1 })
      }
    }
  }

  // ── Helpers ──

  #getCustomers() {
    const reservation = this.#context?.capabilities?.get?.('reservation')
    if (!reservation) return []

    const all = reservation.getAll() || []
    const customerMap = new Map()
    for (const r of all) {
      if (r.customer?.name) {
        customerMap.set(r.customer.name, r.customer)
      }
    }
    return Array.from(customerMap.values())
  }

  #getInactiveCustomers() {
    const customers = this.#getCustomers()
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    return customers.filter(c => {
      const lastVisit = new Date(c.lastVisit || 0).getTime()
      return lastVisit < thirtyDaysAgo
    })
  }
}
