/**
 * Follow-Up Engine — Automated conversation sequences
 *
 * Business-agnostic: sends follow-up messages through CommunicationCapability
 * Uses templates from EngagementCapability
 * No direct capability imports — uses context.capabilities.get()
 */
import { FOLLOWUP_STATUS, validateFollowupAction } from '../conversion.schema.js'
import { CONVERSION_EVENTS } from '../conversion.events.js'

export class FollowUpEngine {
  #context = null
  #actions = new Map()
  #sequences = new Map()

  constructor(context) {
    this.#context = context
    this.#registerDefaultSequences()
  }

  /**
   * Send follow-up after inquiry
   * @param {object} leadData - { customerId, dates, channel }
   * @returns {object}
   */
  async sendInquiryFollowUp(leadData) {
    return this.#sendFollowUp({
      type: 'inquiry',
      customerId: leadData.customerId,
      channel: leadData.channel || 'email',
      templateId: 'followup_inquiry',
      variables: {
        customer: { name: leadData.customerName || 'there' },
        dates: leadData.dates || {},
      },
    })
  }

  /**
   * Send follow-up after no response
   * @param {object} leadData - { customerId, channel, lastMessage }
   * @returns {object}
   */
  async sendNoResponseFollowUp(leadData) {
    return this.#sendFollowUp({
      type: 'no_response',
      customerId: leadData.customerId,
      channel: leadData.channel || 'email',
      templateId: 'followup_no_response',
      variables: {
        customer: { name: leadData.customerName || 'there' },
      },
    })
  }

  /**
   * Send follow-up before expiration
   * @param {object} reservationData - { customerId, reservationId, dates, channel }
   * @returns {object}
   */
  async sendExpirationFollowUp(reservationData) {
    return this.#sendFollowUp({
      type: 'before_expiration',
      customerId: reservationData.customerId,
      channel: reservationData.channel || 'email',
      templateId: 'followup_expiration',
      variables: {
        customer: { name: reservationData.customerName || 'there' },
        reservation: { dates: reservationData.dates || {} },
      },
    })
  }

  /**
   * Send custom follow-up
   * @param {object} data - { customerId, channel, templateId, variables }
   * @returns {object}
   */
  async sendCustomFollowUp(data) {
    return this.#sendFollowUp({
      type: 'custom',
      customerId: data.customerId,
      channel: data.channel || 'email',
      templateId: data.templateId,
      variables: data.variables || {},
    })
  }

  /**
   * Schedule a follow-up sequence
   * @param {object} sequence - { customerId, steps: [{ delayMs, templateId, channel }] }
   * @returns {string} - Sequence ID
   */
  scheduleSequence(sequence) {
    const id = `seq_${Date.now()}`
    this.#sequences.set(id, {
      id,
      tenantId: this.#context?.tenant?.id,
      customerId: sequence.customerId,
      steps: sequence.steps,
      currentStep: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    })
    return id
  }

  /**
   * Get all follow-up actions
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#actions.values())
  }

  /**
   * Get actions by status
   * @param {string} status
   * @returns {object[]}
   */
  getByStatus(status) {
    return Array.from(this.#actions.values()).filter(a => a.status === status)
  }

  /**
   * Get actions by customer
   * @param {string} customerId
   * @returns {object[]}
   */
  getByCustomer(customerId) {
    return Array.from(this.#actions.values()).filter(a => a.customerId === customerId)
  }

  /**
   * Get follow-up stats
   * @returns {object}
   */
  getStats() {
    const all = this.getAll()
    return {
      total: all.length,
      pending: all.filter(a => a.status === FOLLOWUP_STATUS.PENDING).length,
      sent: all.filter(a => a.status === FOLLOWUP_STATUS.SENT).length,
      completed: all.filter(a => a.status === FOLLOWUP_STATUS.COMPLETED).length,
      skipped: all.filter(a => a.status === FOLLOWUP_STATUS.SKIPPED).length,
    }
  }

  // ── Internal ──

  async #sendFollowUp(config) {
    const action = {
      id: `followup_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      customerId: config.customerId,
      type: config.type,
      status: FOLLOWUP_STATUS.PENDING,
      channel: config.channel,
      message: null,
      createdAt: new Date().toISOString(),
    }

    const validation = validateFollowupAction(action)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#actions.set(action.id, action)

    const body = this.#renderTemplate(config.templateId, config.variables)
    if (!body) {
      action.status = FOLLOWUP_STATUS.SKIPPED
      return { success: false, error: 'Template not found' }
    }

    const communication = this.#context?.capabilities?.get?.('communication')
    if (!communication) {
      action.status = FOLLOWUP_STATUS.SKIPPED
      return { success: false, error: 'Communication capability not available' }
    }

    const result = await communication.send({
      channel: config.channel,
      recipient: config.customerId,
      body,
    })

    if (result.success) {
      action.status = FOLLOWUP_STATUS.SENT
      action.sentAt = new Date().toISOString()
      action.message = body
      this.#context?.eventBus?.emit(CONVERSION_EVENTS.FOLLOWUP_SENT, { action })
    } else {
      action.status = FOLLOWUP_STATUS.SKIPPED
      this.#context?.eventBus?.emit(CONVERSION_EVENTS.FOLLOWUP_FAILED, { action })
    }

    return { success: result.success, action }
  }

  #renderTemplate(templateId, variables) {
    const engagement = this.#context?.capabilities?.get?.('engagement')
    if (engagement) {
      const rendered = engagement.templates?.renderByName?.(templateId, variables)
      if (rendered) return rendered.body
    }

    const defaults = {
      followup_inquiry: `Hello {{customer.name}}, thank you for your interest! Do you still need availability for these dates?`,
      followup_no_response: `Hello {{customer.name}}, we noticed you were interested. We still have availability — would you like to proceed?`,
      followup_expiration: `Hello {{customer.name}}, your requested dates are still available. Would you like to confirm your reservation before it expires?`,
    }

    const template = defaults[templateId]
    if (!template) return null

    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.')
      let value = variables
      for (const key of keys) {
        if (value && typeof value === 'object') value = value[key]
        else { value = undefined; break }
      }
      return value !== undefined ? String(value) : match
    })
  }

  #registerDefaultSequences() {
    // Default follow-up sequences can be registered here
  }
}
