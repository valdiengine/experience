import crypto from 'crypto'
import { WordPressWebhookError } from '../errors/wordpress.provider.errors.js'

export class WordPressWebhookValidator {
  #secret = null
  #maxAge = 300

  constructor(config = {}) {
    this.#secret = config.webhookSecret || null
    this.#maxAge = config.webhookMaxAge || 300
  }

  setSecret(secret) {
    this.#secret = secret
  }

  verify(payload, signature, headers = {}) {
    if (!signature && !headers['x-wp-webhook-signature']) {
      throw new WordPressWebhookError('No webhook signature provided')
    }

    const sig = signature || headers['x-wp-webhook-signature'] || ''
    return this.#verifyHmac(payload, sig)
  }

  verifyWithTimestamp(payload, signature, headers = {}) {
    const timestamp = headers['x-wp-webhook-timestamp']
      ? parseInt(headers['x-wp-webhook-timestamp'], 10)
      : null

    if (timestamp && this.#isExpired(timestamp)) {
      throw new WordPressWebhookError('Webhook payload expired (replay attack?)', { timestamp, maxAge: this.#maxAge })
    }

    return this.verify(payload, signature, headers)
  }

  extractEventType(headers, payload) {
    if (payload?.event || payload?.action) {
      return `wordpress:${payload.event || payload.action}`
    }

    if (headers['x-wp-event']) {
      return `wordpress:${headers['x-wp-event']}`
    }

    if (payload?.post?.type) {
      const action = payload?.before === undefined && payload?.after !== undefined ? 'created'
        : payload?.before !== undefined && payload?.after === undefined ? 'deleted'
        : 'updated'
      return `wordpress:${payload.post.type}_${action}`
    }

    return 'wordpress:unknown_event'
  }

  extractEntityId(payload) {
    if (payload?.post?.id) return String(payload.post.id)
    if (payload?.id) return String(payload.id)
    if (payload?.data?.id) return String(payload.data.id)
    return null
  }

  extractEntityType(payload) {
    if (payload?.post?.type) return payload.post.type
    if (payload?.type) return payload.type
    if (payload?.data?.type) return payload.data.type
    return 'unknown'
  }

  #verifyHmac(payload, signature) {
    if (!this.#secret) return false

    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const hmac = crypto.createHmac('sha256', this.#secret)
    hmac.update(rawPayload)
    const expected = `sha256=${hmac.digest('hex')}`

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    } catch {
      return false
    }
  }

  #isExpired(timestamp) {
    const now = Math.floor(Date.now() / 1000)
    return (now - timestamp) > this.#maxAge
  }
}

export default WordPressWebhookValidator
