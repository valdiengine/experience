/**
 * Automation Engine — Log Action
 *
 * Logs messages for debugging and audit
 * Business-agnostic: logging is generic
 */
export class LogAction {
  static type = 'log'

  static async execute(config, context) {
    const { message, level, data } = config

    const resolvedMessage = typeof message === 'string' && message.startsWith('$')
      ? context.evaluate(message.slice(1))
      : message

    const logEntry = {
      ruleId: context.ruleId,
      tenantId: context.tenantId,
      message: resolvedMessage,
      level: level || 'info',
      data,
      timestamp: new Date().toISOString(),
    }

    console.log(`[Automation:${logEntry.level}]`, logEntry)

    return {
      success: true,
      output: logEntry,
    }
  }
}
