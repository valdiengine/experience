import { WordPressWebhookValidator } from './wordpress.webhook.validator.js'
import { WORDPRESS_EVENTS, createWordPressEvent } from '../events/wordpress.events.js'
import { WordPressWebhookError } from '../errors/wordpress.provider.errors.js'

export class WordPressWebhookHandler {
  #validator = null
  #eventBus = null
  #handlers = new Map()

  constructor(config = {}) {
    this.#validator = new WordPressWebhookValidator(config)
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  setSecret(secret) {
    this.#validator.setSecret(secret)
  }

  on(eventType, handler) {
    if (!this.#handlers.has(eventType)) {
      this.#handlers.set(eventType, [])
    }
    this.#handlers.get(eventType).push(handler)
  }

  async process(payload, headers = {}) {
    const signature = headers['x-wp-webhook-signature'] || ''
    const eventType = this.#validator.extractEventType(headers, payload)
    const entityId = this.#validator.extractEntityId(payload)
    const entityType = this.#validator.extractEntityType(payload)

    this.#emit(WORDPRESS_EVENTS.WORDPRESS_WEBHOOK_RECEIVED, {
      eventType,
      entityId,
      entityType,
    })

    const isValid = this.#validator.verifyWithTimestamp(payload, signature, headers)
    this.#emit(WORDPRESS_EVENTS.WORDPRESS_WEBHOOK_VERIFIED, {
      eventType,
      entityId,
      valid: isValid,
    })

    if (!isValid) {
      this.#emit(WORDPRESS_EVENTS.WORDPRESS_WEBHOOK_FAILED, {
        eventType,
        entityId,
        reason: 'invalid_signature',
      })
      throw new WordPressWebhookError('Webhook signature verification failed', { eventType, entityId })
    }

    const result = await this.#dispatch(eventType, payload, headers)

    return {
      processed: true,
      eventType,
      entityId,
      entityType,
      result,
    }
  }

  async #dispatch(eventType, payload, headers) {
    const handlers = this.#handlers.get(eventType) || []
    const wildcardHandlers = this.#handlers.get('*') || []
    const allHandlers = [...handlers, ...wildcardHandlers]

    if (allHandlers.length === 0) return null

    const results = []
    for (const handler of allHandlers) {
      try {
        const result = await handler(payload, headers, eventType)
        results.push(result)
      } catch (err) {
        results.push({ error: err.message })
      }
    }
    return results
  }

  #emit(event, payload) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createWordPressEvent(event, payload))
    }
  }
}

export default WordPressWebhookHandler
