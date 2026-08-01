/**
 * Workflow Engine — Trigger Node
 *
 * Starts workflow execution based on events, schedules, or manual triggers
 * Business-agnostic: triggers are generic event listeners
 */
import { TRIGGER_TYPES } from '../workflow.schema.js'

export class TriggerNode {
  static type = 'trigger'

  /**
   * Execute trigger node — evaluates if trigger condition is met
   * @param {object} node - Node configuration
   * @param {object} context - WorkflowContext
   * @param {object} input - Trigger input data
   * @returns {{ success: boolean, output?: object, error?: string }}
   */
  static async execute(node, context, input = {}) {
    const config = node.config || {}
    const triggerType = config.triggerType || TRIGGER_TYPES.EVENT

    switch (triggerType) {
      case TRIGGER_TYPES.EVENT:
        return TriggerNode.#executeEventTrigger(config, input)
      case TRIGGER_TYPES.MANUAL:
        return TriggerNode.#executeManualTrigger(config, input)
      case TRIGGER_TYPES.SCHEDULE:
        return TriggerNode.#executeScheduleTrigger(config, input)
      case TRIGGER_TYPES.WEBHOOK:
        return TriggerNode.#executeWebhookTrigger(config, input)
      default:
        return { success: false, error: `Unknown trigger type: ${triggerType}` }
    }
  }

  static #executeEventTrigger(config, input) {
    const eventName = config.eventName
    if (!eventName) {
      return { success: false, error: 'Event trigger requires eventName' }
    }

    if (input.eventName !== eventName) {
      return { success: true, output: { triggered: false, reason: 'event_mismatch' } }
    }

    return {
      success: true,
      output: {
        triggered: true,
        eventData: input.eventData || {},
        timestamp: new Date().toISOString(),
      },
    }
  }

  static #executeManualTrigger(config, input) {
    return {
      success: true,
      output: {
        triggered: true,
        data: input.data || {},
        triggeredBy: input.triggeredBy || 'manual',
        timestamp: new Date().toISOString(),
      },
    }
  }

  static #executeScheduleTrigger(config, input) {
    return {
      success: true,
      output: {
        triggered: true,
        scheduledAt: config.schedule,
        timestamp: new Date().toISOString(),
      },
    }
  }

  static #executeWebhookTrigger(config, input) {
    return {
      success: true,
      output: {
        triggered: true,
        webhookData: input.body || {},
        headers: input.headers || {},
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Get node definition
   * @returns {object}
   */
  static getDefinition() {
    return {
      type: 'trigger',
      name: 'Trigger',
      description: 'Starts workflow execution',
      config: {
        triggerType: { type: 'select', options: Object.values(TRIGGER_TYPES), required: true },
        eventName: { type: 'string', description: 'Event name for event triggers' },
        schedule: { type: 'string', description: 'Cron expression for schedule triggers' },
      },
    }
  }
}
