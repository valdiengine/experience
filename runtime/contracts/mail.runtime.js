import { BaseRuntimeContract } from './base.runtime.js'

export class MailRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'mail'
  }

  async send(options) {
    return null
  }

  async sendTemplate(template, data, recipients) {
    return null
  }

  async sendBatch(messages) {
    return []
  }

  async verifyAddress(email) {
    return false
  }

  async getDeliveryStatus(messageId) {
    return null
  }

  async unsubscribe(email, list) {}

  supports(feature) {
    const features = ['template', 'batch', 'attachment', 'tracking', 'sandbox', 'queue', 'bulk']
    return features.includes(feature)
  }
}

export default MailRuntime
