/**
 * Trigger Engine — Automated triggers based on events
 *
 * Business-agnostic: listens to events, executes actions
 * No direct capability imports — uses context.capabilities.get()
 */
import { TRIGGER_TYPE, TRIGGER_STATUS, validateTrigger } from '../engagement.schema.js'
import { ENGAGEMENT_EVENTS } from '../engagement.events.js'

export class TriggerEngine {
  #context = null
  #triggers = new Map()
  #handlers = new Map()

  constructor(context) {
    this.#context = context
    this.#registerDefaultHandlers()
  }

  /**
   * Register a trigger
   * @param {object} triggerDef - { type, name, config, action }
   * @returns {{ success: boolean, trigger?: object, errors?: string[] }}
   */
  register(triggerDef) {
    const trigger = {
      id: triggerDef.id || `trigger_${Date.now()}`,
      tenantId: this.#context?.tenant?.id,
      type: triggerDef.type,
      status: TRIGGER_STATUS.ACTIVE,
      name: triggerDef.name,
      config: triggerDef.config || {},
      action: triggerDef.action || {},
      createdAt: new Date().toISOString(),
    }

    const validation = validateTrigger(trigger)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#triggers.set(trigger.id, trigger)
    return { success: true, trigger }
  }

  /**
   * Activate a trigger
   * @param {string} triggerId
   */
  activate(triggerId) {
    const trigger = this.#triggers.get(triggerId)
    if (trigger) {
      trigger.status = TRIGGER_STATUS.ACTIVE
    }
  }

  /**
   * Pause a trigger
   * @param {string} triggerId
   */
  pause(triggerId) {
    const trigger = this.#triggers.get(triggerId)
    if (trigger) {
      trigger.status = TRIGGER_STATUS.PAUSED
    }
  }

  /**
   * Disable a trigger
   * @param {string} triggerId
   */
  disable(triggerId) {
    const trigger = this.#triggers.get(triggerId)
    if (trigger) {
      trigger.status = TRIGGER_STATUS.DISABLED
    }
  }

  /**
   * Process an event and fire matching triggers
   * @param {string} eventType - Event type
   * @param {object} eventData - Event data
   * @returns {object[]} - Results of triggered actions
   */
  processEvent(eventType, eventData) {
    const results = []

    for (const trigger of this.#triggers.values()) {
      if (trigger.status !== TRIGGER_STATUS.ACTIVE) continue
      if (trigger.type !== eventType) continue

      const handler = this.#handlers.get(trigger.type)
      if (handler) {
        const result = handler(trigger, eventData)
        if (result) {
          results.push(result)
          trigger.lastTriggeredAt = new Date().toISOString()
        }
      }
    }

    return results
  }

  /**
   * Get all triggers for a tenant
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#triggers.values())
  }

  /**
   * Get active triggers
   * @returns {object[]}
   */
  getActive() {
    return Array.from(this.#triggers.values()).filter(t => t.status === TRIGGER_STATUS.ACTIVE)
  }

  /**
   * Get trigger by ID
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    return this.#triggers.get(id) || null
  }

  /**
   * Remove trigger
   * @param {string} triggerId
   */
  remove(triggerId) {
    this.#triggers.delete(triggerId)
  }

  // ── Default Handlers ──

  #registerDefaultHandlers() {
    this.#handlers.set(TRIGGER_TYPE.RESERVATION_CREATED, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'send_message',
        templateId: trigger.action.templateId || 'reservation_confirmation',
        recipient: data.reservation?.customer?.email || data.reservation?.customer?.phone,
        channel: trigger.action.channel || 'email',
        variables: {
          customer: data.reservation?.customer || {},
          reservation: data.reservation || {},
        },
      })
    })

    this.#handlers.set(TRIGGER_TYPE.RESERVATION_CONFIRMED, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'send_message',
        templateId: trigger.action.templateId || 'reservation_confirmed',
        recipient: data.reservation?.customer?.email || data.reservation?.customer?.phone,
        channel: trigger.action.channel || 'email',
        variables: {
          customer: data.reservation?.customer || {},
          reservation: data.reservation || {},
        },
      })
    })

    this.#handlers.set(TRIGGER_TYPE.RESERVATION_CANCELLED, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'send_message',
        templateId: trigger.action.templateId || 'reservation_cancelled',
        recipient: data.reservation?.customer?.email || data.reservation?.customer?.phone,
        channel: trigger.action.channel || 'email',
        variables: {
          customer: data.reservation?.customer || {},
          reservation: data.reservation || {},
        },
      })
    })

    this.#handlers.set(TRIGGER_TYPE.RESERVATION_EXPIRED, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'send_message',
        templateId: trigger.action.templateId || 'reservation_expired',
        recipient: data.reservation?.customer?.email || data.reservation?.customer?.phone,
        channel: trigger.action.channel || 'email',
        variables: {
          customer: data.reservation?.customer || {},
          reservation: data.reservation || {},
        },
      })
    })

    this.#handlers.set(TRIGGER_TYPE.TIME_BASED, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'send_message',
        templateId: trigger.action.templateId,
        recipient: trigger.action.recipient,
        channel: trigger.action.channel || 'email',
        variables: data,
      })
    })

    this.#handlers.set(TRIGGER_TYPE.CUSTOMER_INACTIVE, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'send_message',
        templateId: trigger.action.templateId || 'customer_recovery',
        recipient: data.customer?.email || data.customer?.phone,
        channel: trigger.action.channel || 'email',
        variables: {
          customer: data.customer || {},
        },
      })
    })

    this.#handlers.set(TRIGGER_TYPE.LOW_DEMAND, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'request_availability',
        channel: trigger.action.channel || 'whatsapp',
        message: trigger.action.message || 'Do you have availability for the coming weeks?',
        ownerId: data.ownerId,
      })
    })

    this.#handlers.set(TRIGGER_TYPE.AVAILABILITY_REQUEST, (trigger, data) => {
      return this.#executeAction(trigger, {
        type: 'request_availability',
        channel: trigger.action.channel || 'whatsapp',
        message: trigger.action.message,
        ownerId: data.ownerId,
      })
    })
  }

  #executeAction(trigger, action) {
    const communication = this.#context?.capabilities?.get?.('communication')
    const availability = this.#context?.capabilities?.get?.('availability')
    const notifications = this.#context?.capabilities?.get?.('notifications')

    if (action.type === 'send_message') {
      if (communication) {
        const messageBody = this.#resolveTemplate(action.templateId, action.variables)
        communication.send({
          channel: action.channel,
          recipient: action.recipient,
          body: messageBody,
        })
      } else if (notifications) {
        const messageBody = this.#resolveTemplate(action.templateId, action.variables)
        notifications.send({
          channel: action.channel,
          recipient: action.recipient,
          body: messageBody,
        })
      }
    }

    if (action.type === 'request_availability') {
      if (availability) {
        availability.requestAvailability({
          ownerId: action.ownerId,
          channel: action.channel,
          message: action.message,
        })
      }
    }

    this.#context?.eventBus?.emit(ENGAGEMENT_EVENTS.TRIGGERED, {
      triggerId: trigger.id,
      type: trigger.type,
      action,
    })

    return { triggerId: trigger.id, type: trigger.type, success: true }
  }

  #resolveTemplate(templateId, variables = {}) {
    const templates = this.#context?.capabilities?.get?.('engagement')
    if (templates) {
      const built = templates.builder?.build(templateId, variables)
      if (built) return built.body || built
    }
    return `[${templateId}] ${JSON.stringify(variables)}`
  }
}
