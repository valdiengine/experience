import { WordPressClient } from './client/wordpress.client.js'
import { WordPressContentReader } from './content/wordpress.content.reader.js'
import { WordPressContentWriter } from './content/wordpress.content.writer.js'
import { WordPressMediaClient } from './media/wordpress.media.client.js'
import { WordPressMediaProcessor } from './media/wordpress.media.processor.js'
import { WordPressSeoSync } from './seo/wordpress.seo.sync.js'
import { WordPressWebhookHandler } from './webhook/wordpress.webhook.handler.js'
import { WordPressSyncAdapter } from './sync/wordpress.sync.adapter.js'
import { WORDPRESS_EVENTS, createWordPressEvent } from './events/wordpress.events.js'
import { WordPressProviderError } from './errors/wordpress.provider.errors.js'

export class WordPressProvider {
  #client = null
  #reader = null
  #writer = null
  #mediaClient = null
  #mediaProcessor = null
  #seoSync = null
  #webhookHandler = null
  #syncAdapter = null
  #eventBus = null
  #initialized = false
  #config = {}
  #providerName = 'wordpress'
  #providerVersion = '1.0.0'

  constructor(config = {}) {
    this.#config = config
    this.#client = new WordPressClient(config)
    this.#reader = new WordPressContentReader(this.#client)
    this.#writer = new WordPressContentWriter(this.#client)
    this.#mediaClient = new WordPressMediaClient(this.#client)
    this.#mediaProcessor = new WordPressMediaProcessor()
    this.#seoSync = new WordPressSeoSync(this.#client)
    this.#webhookHandler = new WordPressWebhookHandler(config)
    this.#syncAdapter = new WordPressSyncAdapter(this.#client)
  }

  get name() {
    return this.#providerName
  }

  get version() {
    return this.#providerVersion
  }

  get initialized() {
    return this.#initialized
  }

  get client() {
    return this.#client
  }

  get reader() {
    return this.#reader
  }

  get writer() {
    return this.#writer
  }

  get media() {
    return this.#mediaClient
  }

  get mediaProcessor() {
    return this.#mediaProcessor
  }

  get seo() {
    return this.#seoSync
  }

  get webhook() {
    return this.#webhookHandler
  }

  get sync() {
    return this.#syncAdapter
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#client.setEventBus(eventBus)
    this.#webhookHandler.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return

    try {
      const secrets = await this.#resolveSecrets()

      this.#webhookHandler.setSecret(secrets.webhookSecret)

      await this.#client.connect(secrets)

      this.#initialized = true

      this.#emit(WORDPRESS_EVENTS.WORDPRESS_CONNECTED, {
        siteUrl: this.#client.baseUrl,
        authMethod: this.#client.authMethod,
      })
    } catch (err) {
      this.#emit(WORDPRESS_EVENTS.WORDPRESS_ERROR, { error: err.message, phase: 'initialize' })
      throw new WordPressProviderError(`WordPress provider initialization failed: ${err.message}`, { error: err })
    }
  }

  async shutdown() {
    if (!this.#initialized) return

    this.#client.disconnect()
    this.#initialized = false

    this.#emit(WORDPRESS_EVENTS.WORDPRESS_DISCONNECTED, {
      siteUrl: this.#client.baseUrl,
    })
  }

  async dispose() {
    await this.shutdown()
  }

  async health() {
    const result = await this.#client.health()

    return {
      provider: this.#providerName,
      version: this.#providerVersion,
      connected: result.connected,
      latency: result.latency,
      apiAvailable: result.apiAvailable,
      siteName: result.siteName,
      wpVersion: result.version,
      initialized: this.#initialized,
      timestamp: Date.now(),
    }
  }

  available() {
    return this.#initialized && this.#client.connected
  }

  supports(feature) {
    const features = [
      'content:get', 'content:query', 'content:create', 'content:update', 'content:delete',
      'content:publish', 'content:unpublish', 'content:archive',
      'media:upload', 'media:get', 'media:delete', 'media:serve',
      'seo:get', 'seo:set',
      'sync:pull', 'sync:push',
      'webhook:subscribe', 'webhook:unsubscribe', 'webhook:verify',
    ]
    return features.includes(feature)
  }

  async contentGet(type, id, options = {}) {
    return this.#reader.get(type, id, options)
  }

  async contentQuery(type, filters = {}, pagination = {}) {
    return this.#reader.query(type, filters, pagination)
  }

  async contentCreate(type, data) {
    const result = await this.#writer.create(type, data)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_CONTENT_CREATED, {
      type,
      cmsId: result?.cmsId,
      provider: this.#providerName,
    })
    return result
  }

  async contentUpdate(type, id, data) {
    const result = await this.#writer.update(type, id, data)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_CONTENT_UPDATED, {
      type,
      cmsId: id,
      provider: this.#providerName,
    })
    return result
  }

  async contentDelete(type, id) {
    const result = await this.#writer.delete(type, id)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_CONTENT_DELETED, {
      type,
      cmsId: id,
      provider: this.#providerName,
    })
    return result
  }

  async contentPublish(type, id) {
    const result = await this.#writer.publish(type, id)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_CONTENT_PUBLISHED, {
      type,
      cmsId: id,
      provider: this.#providerName,
    })
    return result
  }

  async contentUnpublish(type, id) {
    const result = await this.#writer.unpublish(type, id)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_CONTENT_UNPUBLISHED, {
      type,
      cmsId: id,
      provider: this.#providerName,
    })
    return result
  }

  async mediaUpload(file, options = {}) {
    const result = await this.#mediaClient.upload(file, options)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_MEDIA_UPLOADED, {
      mediaId: result?.mediaId,
      mimeType: result?.mimeType,
      provider: this.#providerName,
    })
    return result
  }

  async mediaGet(id) {
    return this.#mediaClient.get(id)
  }

  async mediaDelete(id) {
    const result = await this.#mediaClient.delete(id)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_MEDIA_DELETED, {
      mediaId: id,
      provider: this.#providerName,
    })
    return result
  }

  async mediaServe(id, transforms = {}) {
    return this.#mediaClient.getUrl(id, transforms)
  }

  async seoGet(entityId, entityType) {
    return this.#seoSync.get(entityId, entityType)
  }

  async seoSet(entityId, entityType, data) {
    return { entityId, entityType, note: 'SEO write via WordPress REST API requires Yoast plugin support' }
  }

  async syncPull(entityType, options = {}) {
    const since = options.since || null
    const pagination = options.pagination || {}
    return this.#syncAdapter.pullChangedSince(entityType, since, pagination)
  }

  async syncPush(entityType, items) {
    const results = []
    for (const item of items || []) {
      try {
        let result
        if (entityType === 'post') result = await this.#syncAdapter.pushPost(item)
        else if (entityType === 'page') result = await this.#syncAdapter.pushPage(item)
        else result = null
        results.push(result)
      } catch (err) {
        results.push({ error: err.message, item })
      }
    }
    return { synced: results.filter(r => r && !r.error), conflicts: [], failed: results.filter(r => r?.error) }
  }

  async webhookSubscribe(events, url, secret, options = {}) {
    return { provider: this.#providerName, events, url, note: 'WordPress webhooks configured via WordPress admin or WP-CLI' }
  }

  async webhookUnsubscribe(webhookId) {
    return { provider: this.#providerName, webhookId, note: 'WordPress webhooks managed outside this provider' }
  }

  async webhookVerify(payload, signature) {
    return this.#webhookHandler.verify(payload, signature)
  }

  async #resolveSecrets() {
    const secrets = this.#config.secrets || {}
    return {
      username: secrets.username || process.env.CMS_WORDPRESS_USERNAME || '',
      applicationPassword: secrets.applicationPassword || secrets.password || process.env.CMS_WORDPRESS_APPLICATION_PASSWORD || '',
      webhookSecret: secrets.webhookSecret || process.env.CMS_WORDPRESS_WEBHOOK_SECRET || '',
      token: secrets.token || process.env.CMS_WORDPRESS_TOKEN || '',
    }
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createWordPressEvent(event, payload))
    }
  }
}

export default WordPressProvider
