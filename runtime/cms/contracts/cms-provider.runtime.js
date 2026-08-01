import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class CmsProviderRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-provider'
    this.providerName = null
    this.providerVersion = null
    this.features = []
  }

  async health() {
    return { status: 'unknown', provider: this.name, version: this.providerVersion, timestamp: Date.now() }
  }

  supports(feature) {
    return this.features.includes(feature)
  }

  async getCapabilities() {
    return { provider: this.providerName, version: this.providerVersion, features: this.features }
  }

  async contentGet(id, options) {
    return null
  }

  async contentQuery(filters, pagination) {
    return { items: [], total: 0 }
  }

  async contentCreate(data) {
    return null
  }

  async contentUpdate(id, data) {
    return null
  }

  async contentDelete(id) {}

  async contentPublish(id) {}

  async contentUnpublish(id) {}

  async mediaUpload(file, options) {
    return null
  }

  async mediaGet(id) {
    return null
  }

  async mediaDelete(id) {}

  async mediaServe(id, transforms) {
    return null
  }

  async seoGet(entityId, entityType) {
    return null
  }

  async seoSet(entityId, entityType, data) {
    return null
  }

  async syncPull(entityType, options) {
    return { items: [], checkpoint: null }
  }

  async syncPush(entityType, items) {
    return { synced: [], conflicts: [], failed: [] }
  }

  async webhookSubscribe(events, url, secret, options) {
    return null
  }

  async webhookUnsubscribe(webhookId) {}

  async webhookVerify(payload, signature) {
    return false
  }
}

export default CmsProviderRuntime
