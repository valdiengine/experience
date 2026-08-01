/**
 * Workflow Engine — Delay Node
 *
 * Pauses workflow execution for a specified duration
 * Business-agnostic: delays are time-based, not business-aware
 */

export class DelayNode {
  static type = 'delay'

  /**
   * Execute delay node — pause execution
   * @param {object} node - Node configuration
   * @param {object} context - WorkflowContext
   * @returns {{ success: boolean, output?: object, error?: string }}
   */
  static async execute(node, context) {
    const config = node.config || {}
    const { delayType, duration, durationMs, unit } = config

    let ms = 0

    switch (delayType) {
      case 'fixed':
        ms = DelayNode.#parseDuration(duration, unit)
        break
      case 'dynamic':
        const dynamicValue = context.evaluate(duration)
        ms = DelayNode.#parseDuration(dynamicValue, unit)
        break
      case 'until':
        const untilTime = new Date(config.until).getTime()
        ms = Math.max(0, untilTime - Date.now())
        break
      case 'ms':
        ms = durationMs || 0
        break
      default:
        ms = DelayNode.#parseDuration(duration, unit)
    }

    if (ms <= 0) {
      return {
        success: true,
        output: { delayed: false, reason: 'zero_delay', ms: 0 },
      }
    }

    return {
      success: true,
      output: {
        delayed: true,
        ms,
        resumeAt: new Date(Date.now() + ms).toISOString(),
        delayType: delayType || 'fixed',
      },
      delayMs: ms,
    }
  }

  static #parseDuration(value, unit) {
    const num = parseInt(value, 10)
    if (isNaN(num)) return 0

    switch (unit) {
      case 'ms': return num
      case 'seconds': return num * 1000
      case 'minutes': return num * 60000
      case 'hours': return num * 3600000
      case 'days': return num * 86400000
      default: return num
    }
  }

  static getDefinition() {
    return {
      type: 'delay',
      name: 'Delay',
      description: 'Pauses workflow execution for a duration',
      config: {
        delayType: {
          type: 'select',
          options: ['fixed', 'dynamic', 'until', 'ms'],
          required: true,
        },
        duration: { type: 'number', description: 'Duration value' },
        durationMs: { type: 'number', description: 'Duration in milliseconds (for ms type)' },
        unit: { type: 'select', options: ['ms', 'seconds', 'minutes', 'hours', 'days'] },
        until: { type: 'string', description: 'ISO date string for until type' },
      },
    }
  }
}
