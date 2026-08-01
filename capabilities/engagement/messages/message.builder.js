/**
 * Message Builder — Builds messages from templates and data
 *
 * Business-agnostic: resolves variables, selects channels, constructs messages
 * No direct capability imports — uses context.capabilities.get()
 */
import { ENGAGEMENT_EVENTS } from '../engagement.events.js'

export class MessageBuilder {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Build a message from template ID and variables
   * @param {string} templateId
   * @param {object} variables
   * @returns {object|null} - { subject, body, channel }
   */
  build(templateId, variables = {}) {
    const engagement = this.#context?.capabilities?.get?.('engagement')
    if (!engagement) return null

    const template = engagement.templates?.getById(templateId)
    if (!template) return null

    return {
      subject: template.subject ? this.#interpolate(template.subject, variables) : null,
      body: this.#interpolate(template.body, variables),
      channel: template.channel,
      templateId: template.id,
    }
  }

  /**
   * Build a message from template name and variables
   * @param {string} templateName
   * @param {object} variables
   * @returns {object|null}
   */
  buildByName(templateName, variables = {}) {
    const engagement = this.#context?.capabilities?.get?.('engagement')
    if (!engagement) return null

    const template = engagement.templates?.getByName(templateName)
    if (!template) return null

    return {
      subject: template.subject ? this.#interpolate(template.subject, variables) : null,
      body: this.#interpolate(template.body, variables),
      channel: template.channel,
      templateId: template.id,
    }
  }

  /**
   * Build and send a message
   * @param {string} templateId
   * @param {string} recipient
   * @param {object} variables
   * @param {object} options - { channel?, campaignId?, triggerId? }
   * @returns {Promise<object>}
   */
  async buildAndSend(templateId, recipient, variables = {}, options = {}) {
    const built = this.build(templateId, variables)
    if (!built) return { success: false, error: 'Template not found' }

    const channel = options.channel || built.channel
    const communication = this.#context?.capabilities?.get?.('communication')

    if (!communication) {
      return { success: false, error: 'Communication capability not available' }
    }

    const result = await communication.send({
      channel,
      recipient,
      subject: built.subject,
      body: built.body,
      templateId: built.templateId,
      campaignId: options.campaignId,
      triggerId: options.triggerId,
    })

    if (result.success) {
      this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.MESSAGE_SENT, {
        templateId: built.templateId,
        channel,
        recipient,
      })
    }

    return result
  }

  /**
   * Build a reservation message
   * @param {string} templateName
   * @param {object} reservation
   * @param {object} customer
   * @returns {object|null}
   */
  buildReservationMessage(templateName, reservation, customer) {
    return this.buildByName(templateName, {
      customer: customer || reservation?.customer || {},
      reservation: reservation || {},
      business: this.#context?.tenant || {},
      tenant: this.#context?.tenant || {},
    })
  }

  /**
   * Build an availability request message
   * @param {string} templateName
   * @param {object} owner
   * @param {object} options
   * @returns {object|null}
   */
  buildAvailabilityRequest(templateName, owner, options = {}) {
    return this.buildByName(templateName, {
      owner: owner || {},
      business: this.#context?.tenant || {},
      tenant: this.#context?.tenant || {},
      ...options,
    })
  }

  /**
   * Build a campaign message
   * @param {string} templateName
   * @param {object} customer
   * @param {object} campaignData
   * @returns {object|null}
   */
  buildCampaignMessage(templateName, customer, campaignData = {}) {
    return this.buildByName(templateName, {
      customer: customer || {},
      campaign: campaignData,
      business: this.#context?.tenant || {},
      tenant: this.#context?.tenant || {},
    })
  }

  // ── Private Methods ──

  #interpolate(template, variables) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.')
      let value = variables
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key]
        } else {
          value = undefined
          break
        }
      }
      return value !== undefined ? String(value) : match
    })
  }
}
