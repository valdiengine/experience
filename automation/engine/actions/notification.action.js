/**
 * Automation Engine — Notification Action
 *
 * Sends notifications via the notifications capability
 * Business-agnostic: notification sending is generic
 */
export class NotificationAction {
  static type = 'notification'

  static async execute(config, context) {
    const { templateId, recipient, channel, variables, priority, category } = config

    const notificationService = context.getService('notification')
    if (!notificationService) {
      return { success: false, error: 'Notification service not available' }
    }

    // Resolve recipient from context
    const resolvedRecipient = typeof recipient === 'string' && recipient.startsWith('$')
      ? context.evaluate(recipient.slice(1))
      : recipient

    // Resolve variables from context
    const resolvedVariables = {}
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        resolvedVariables[key] = typeof value === 'string' && value.startsWith('$')
          ? context.evaluate(value.slice(1))
          : value
      }
    }

    const result = await notificationService.sendFromTemplate({
      tenantId: context.tenantId,
      templateId,
      recipient: resolvedRecipient,
      channel,
      variables: resolvedVariables,
      priority,
      category,
    })

    return {
      success: result?.success || false,
      output: result,
    }
  }
}
