import { CmsRuntimeContext } from './cms.runtime.context.js'
import { CmsRuntimeRegistry } from './cms.runtime.registry.js'
import { CmsRuntimeFactory } from './cms.runtime.factory.js'
import { CmsRuntimeHealth } from './cms.runtime.health.js'
import { CMS_RUNTIME_EVENTS, createCmsRuntimeEvent } from './cms.runtime.events.js'
import { CmsInitializationError } from './cms.runtime.errors.js'

export class CmsRuntimeIntegration {
  #contentEngine = null
  #mediaEngine = null
  #seoEngine = null
  #syncEngine = null
  #previewEngine = null
  #templateEngine = null
  #webhookEngine = null
  #context = null
  #registry = null
  #factory = null
  #health = null
  #eventBus = null
  #initialized = false
  #config = {}

  constructor(config = {}) {
    this.#config = config
    this.#registry = new CmsRuntimeRegistry(config)
    this.#factory = new CmsRuntimeFactory(config)
    this.#health = new CmsRuntimeHealth(config)
  }

  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get health() { return this.#health }
  get contentEngine() { return this.#contentEngine }
  get mediaEngine() { return this.#mediaEngine }
  get seoEngine() { return this.#seoEngine }
  get syncEngine() { return this.#syncEngine }
  get previewEngine() { return this.#previewEngine }
  get templateEngine() { return this.#templateEngine }
  get webhookEngine() { return this.#webhookEngine }
  get context() { return this.#context }
  get initialized() { return this.#initialized }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#health.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return

    try {
      this.#registry.initialize()
      this.#registry.register('default', {
        version: this.#config.version || '1.0.0',
        provider: this.#config.provider || 'wordpress',
        features: ['content', 'media', 'seo', 'sync', 'preview', 'template', 'webhook'],
        priority: 0,
      })

      this.#context = new CmsRuntimeContext(this, this.#config)
      this.#initialized = true

      this.#emit(CMS_RUNTIME_EVENTS.RUNTIME_CMS_INITIALIZED, {
        provider: this.#config.provider || 'wordpress',
        version: this.#config.version || '1.0.0',
      })
    } catch (err) {
      this.#emit(CMS_RUNTIME_EVENTS.RUNTIME_CMS_ERROR, { error: err.message })
      throw new CmsInitializationError(`Failed to initialize CMS runtime: ${err.message}`, { error: err })
    }
  }

  async shutdown() {
    if (!this.#initialized) return

    try {
      if (this.#contentEngine) await this.#contentEngine.shutdown()
      if (this.#mediaEngine) await this.#mediaEngine.shutdown()
      if (this.#seoEngine) await this.#seoEngine.shutdown()
      if (this.#syncEngine) await this.#syncEngine.shutdown()
      if (this.#previewEngine) await this.#previewEngine.shutdown()
      if (this.#templateEngine) await this.#templateEngine.shutdown()
      if (this.#webhookEngine) await this.#webhookEngine.shutdown()

      this.#registry.updateStatus('default', 'stopped')
      this.#initialized = false
      this.#emit(CMS_RUNTIME_EVENTS.RUNTIME_CMS_SHUTDOWN, { timestamp: Date.now() })
    } catch (err) {
      this.#emit(CMS_RUNTIME_EVENTS.RUNTIME_CMS_ERROR, { error: err.message })
    }
  }

  async dispose() {
    if (this.#contentEngine) await this.#contentEngine.dispose()
    if (this.#mediaEngine) await this.#mediaEngine.dispose()
    if (this.#seoEngine) await this.#seoEngine.dispose()
    if (this.#syncEngine) await this.#syncEngine.dispose()
    if (this.#previewEngine) await this.#previewEngine.dispose()
    if (this.#templateEngine) await this.#templateEngine.dispose()
    if (this.#webhookEngine) await this.#webhookEngine.dispose()

    this.#contentEngine = null
    this.#mediaEngine = null
    this.#seoEngine = null
    this.#syncEngine = null
    this.#previewEngine = null
    this.#templateEngine = null
    this.#webhookEngine = null
    this.#initialized = false
  }

  async health() {
    return this.#health.checkAll(this)
  }

  available() {
    return this.#initialized
  }

  supports(feature) {
    const features = ['content', 'media', 'seo', 'sync', 'preview', 'template', 'webhook']
    return features.includes(feature)
  }

  registerProvider(name, ProviderClass, config = {}) {
    this.#factory.register(name, ProviderClass)
    this.#registry.register(name, {
      version: config.version || '1.0.0',
      provider: name,
      features: config.features || [],
      priority: config.priority || 0,
    })
    this.#emit(CMS_RUNTIME_EVENTS.RUNTIME_CMS_REGISTERED, { provider: name, version: config.version || '1.0.0' })
  }

  setContracts(contracts) {
    const { content, media, seo, sync, preview, template, webhook } = contracts || {}
    this.#contentEngine = content || null
    this.#mediaEngine = media || null
    this.#seoEngine = seo || null
    this.#syncEngine = sync || null
    this.#previewEngine = preview || null
    this.#templateEngine = template || null
    this.#webhookEngine = webhook || null
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createCmsRuntimeEvent(event, data))
    }
  }
}

export default CmsRuntimeIntegration
