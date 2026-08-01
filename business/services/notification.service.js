/**
 * Business Services — Notification Service
 *
 * Thin orchestration layer between notifications capability and UI/workflows
 * Business-agnostic: sends notifications via configured channels
 */
export class NotificationService {
  #capabilities = null

  constructor(capabilities) {
    this.#capabilities = capabilities
  }

  async send(data) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.send({
      tenantId: data.tenantId,
      channel: data.channel,
      recipient: data.recipient,
      subject: data.subject,
      body: data.body,
      category: data.category,
      priority: data.priority,
    })
  }

  async sendFromTemplate(data) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.sendFromTemplate({
      tenantId: data.tenantId,
      templateId: data.templateId,
      recipient: data.recipient,
      recipientId: data.recipientId,
      channel: data.channel,
      variables: data.variables,
      priority: data.priority,
      category: data.category,
    })
  }

  schedule(data) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.schedule(data)
  }

  getTemplates(tenantId, filter) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.templates?.getAll(filter) || []
  }

  renderTemplate(templateId, variables) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.templates?.render(templateId, variables)
  }

  getStats(tenantId, channel) {
    const notifications = this.#capabilities.get('notifications')
    return notifications?.analytics?.getStats(tenantId, channel)
  }
}
