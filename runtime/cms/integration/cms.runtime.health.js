import { CMS_RUNTIME_EVENTS, createCmsRuntimeEvent } from './cms.runtime.events.js'

export class CmsRuntimeHealth {
  #eventBus = null
  #overallStatus = 'unknown'
  #results = []

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async checkAll(integration) {
    if (!integration || !integration.initialized) {
      return {
        status: 'unavailable',
        components: [],
        timestamp: Date.now(),
      }
    }

    const components = [
      { name: 'content', ref: integration.contentEngine },
      { name: 'media', ref: integration.mediaEngine },
      { name: 'seo', ref: integration.seoEngine },
      { name: 'sync', ref: integration.syncEngine },
      { name: 'preview', ref: integration.previewEngine },
      { name: 'template', ref: integration.templateEngine },
      { name: 'webhook', ref: integration.webhookEngine },
    ]

    const results = []
    for (const component of components) {
      if (!component.ref) continue
      try {
        const healthResult = await component.ref.health()
        results.push({
          name: component.name,
          status: healthResult?.status || 'unknown',
          timestamp: Date.now(),
        })
      } catch {
        results.push({ name: component.name, status: 'unhealthy', timestamp: Date.now() })
      }
    }

    const previousOverall = this.#overallStatus
    this.#overallStatus = results.length === 0 ? 'healthy' : this.#aggregate(results)
    this.#results = results

    if (previousOverall && previousOverall !== this.#overallStatus) {
      this.#emit(CMS_RUNTIME_EVENTS.RUNTIME_CMS_HEALTH_CHANGED, {
        from: previousOverall,
        to: this.#overallStatus,
        components: results,
      })
    }

    return {
      status: this.#overallStatus,
      components: results,
      timestamp: Date.now(),
    }
  }

  get overallStatus() {
    return this.#overallStatus
  }

  get healthy() {
    return this.#overallStatus === 'healthy'
  }

  #aggregate(results) {
    if (results.length === 0) return 'unknown'
    const statuses = new Set(results.map(r => r.status))
    if (statuses.has('unhealthy') || statuses.has('failed')) return 'failed'
    if (statuses.has('degraded')) return 'degraded'
    if (results.every(r => r.status === 'healthy')) return 'healthy'
    return 'unknown'
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createCmsRuntimeEvent(event, data))
    }
  }
}

export default CmsRuntimeHealth
