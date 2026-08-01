import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class WebhookRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-webhook'
  }

  async subscribe(events, url, secret, options) {
    return null
  }

  async unsubscribe(webhookId) {}

  async verify(payload, signature, secret) {
    return false
  }

  async process(payload, headers) {
    return null
  }

  async list(tenantId) {
    return []
  }

  async get(webhookId) {
    return null
  }

  async pause(webhookId) {}

  async resume(webhookId) {}

  async getLogs(webhookId, filters) {
    return { logs: [], total: 0 }
  }

  supports(feature) {
    const features = ['subscribe', 'unsubscribe', 'verify', 'process', 'list', 'pause', 'resume', 'logs', 'hmac', 'retry']
    return features.includes(feature)
  }
}

export default WebhookRuntime
