/**
 * PUSH-3 — Push Campaign Model
 *
 * Represents a push notification campaign created by a business owner.
 * Each campaign belongs to exactly one canonical ApplicationIdentity.
 */

export const CAMPAIGN_STATUS = Object.freeze({
  DRAFT: 'draft',
  SENDING: 'sending',
  SENT: 'sent',
  PARTIAL: 'partial',
  FAILED: 'failed'
})

export const CAMPAIGN_TYPE = Object.freeze({
  OWNER_CAMPAIGN: 'owner_campaign'
})

export class PushCampaign {
  #id
  #applicationId
  #title
  #body
  #url
  #status
  #createdBy
  #createdAt
  #sentAt
  #audienceCount
  #attempted
  #sent
  #failed
  #expired
  #icon
  #campaignType

  constructor(data = {}) {
    this.#id = data.id || this.#generateId()
    this.#applicationId = data.applicationId || null
    this.#title = data.title || ''
    this.#body = data.body || ''
    this.#url = data.url || ''
    this.#status = data.status || CAMPAIGN_STATUS.DRAFT
    this.#createdBy = data.createdBy || null
    this.#createdAt = data.createdAt || new Date().toISOString()
    this.#sentAt = data.sentAt || null
    this.#audienceCount = data.audienceCount || 0
    this.#attempted = data.attempted || 0
    this.#sent = data.sent || 0
    this.#failed = data.failed || 0
    this.#expired = data.expired || 0
    this.#icon = data.icon || null
    this.#campaignType = data.campaignType || CAMPAIGN_TYPE.OWNER_CAMPAIGN
  }

  #generateId() {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `campaign_${timestamp}_${random}`
  }

  get id() {
    return this.#id
  }

  get applicationId() {
    return this.#applicationId
  }

  get title() {
    return this.#title
  }

  get body() {
    return this.#body
  }

  get url() {
    return this.#url
  }

  get status() {
    return this.#status
  }

  get createdBy() {
    return this.#createdBy
  }

  get createdAt() {
    return this.#createdAt
  }

  get sentAt() {
    return this.#sentAt
  }

  get audienceCount() {
    return this.#audienceCount
  }

  get attempted() {
    return this.#attempted
  }

  get sent() {
    return this.#sent
  }

  get failed() {
    return this.#failed
  }

  get expired() {
    return this.#expired
  }

  get icon() {
    return this.#icon
  }

  get campaignType() {
    return this.#campaignType
  }

  get isDraft() {
    return this.#status === CAMPAIGN_STATUS.DRAFT
  }

  get isSending() {
    return this.#status === CAMPAIGN_STATUS.SENDING
  }

  get isSent() {
    return [CAMPAIGN_STATUS.SENT, CAMPAIGN_STATUS.PARTIAL].includes(this.#status)
  }

  setTitle(title) {
    this.#title = title
    return this
  }

  setBody(body) {
    this.#body = body
    return this
  }

  setUrl(url) {
    this.#url = url
    return this
  }

  setStatus(status) {
    this.#status = status
    return this
  }

  markSending() {
    this.#status = CAMPAIGN_STATUS.SENDING
    return this
  }

  markSent(results = {}) {
    this.#status = results.failed > 0 || results.expired > 0 ? CAMPAIGN_STATUS.PARTIAL : CAMPAIGN_STATUS.SENT
    this.#sentAt = new Date().toISOString()
    this.#attempted = results.attempted || this.#attempted
    this.#sent = results.sent || this.#sent
    this.#failed = results.failed || this.#failed
    this.#expired = results.expired || this.#expired
    return this
  }

  markFailed() {
    this.#status = CAMPAIGN_STATUS.FAILED
    this.#sentAt = new Date().toISOString()
    return this
  }

  toJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      title: this.#title,
      body: this.#body,
      url: this.#url,
      status: this.#status,
      createdBy: this.#createdBy,
      createdAt: this.#createdAt,
      sentAt: this.#sentAt,
      audienceCount: this.#audienceCount,
      attempted: this.#attempted,
      sent: this.#sent,
      failed: this.#failed,
      expired: this.#expired,
      icon: this.#icon,
      campaignType: this.#campaignType
    }
  }

  toSafeJSON() {
    return {
      id: this.#id,
      applicationId: this.#applicationId,
      title: this.#title,
      body: this.#body,
      url: this.#url,
      status: this.#status,
      createdBy: this.#createdBy,
      createdAt: this.#createdAt,
      sentAt: this.#sentAt,
      audienceCount: this.#audienceCount,
      attempted: this.#attempted,
      sent: this.#sent,
      failed: this.#failed,
      expired: this.#expired,
      icon: this.#icon,
      campaignType: this.#campaignType
    }
  }

  static fromJSON(data) {
    return new PushCampaign(data)
  }

  static fromSafeJSON(data) {
    return new PushCampaign(data)
  }
}

export function createPushCampaign(data) {
  return new PushCampaign(data)
}

export default {
  PushCampaign,
  createPushCampaign,
  CAMPAIGN_STATUS,
  CAMPAIGN_TYPE
}
