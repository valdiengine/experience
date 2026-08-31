/**
 * PUSH-3 — Push Campaign Service
 *
 * Handles push campaign creation, validation, and sending.
 * Uses Application-scoped persistence for campaign isolation.
 */

import { PushCampaign, CAMPAIGN_STATUS, createPushCampaign, PUSH_ENVIRONMENTS } from './push.campaign.model.js'
import { createPushSubscriptionService } from './push.subscription.service.js'
import { createPushSubscriptionPersistence } from './persistence/push.subscription.persistence.js'
import { createPushCampaignPersistence } from './persistence/push.campaign.persistence.js'

export const CAMPAIGN_VALIDATION_ERRORS = Object.freeze({
  MISSING_ENVIRONMENT: 'environment is required and must be staging or production',
  MISSING_APPLICATION_ID: 'applicationId is required',
  MISSING_TITLE: 'title is required',
  TITLE_TOO_LONG: 'title exceeds maximum length (80 characters)',
  MISSING_BODY: 'body is required',
  BODY_TOO_LONG: 'body exceeds maximum length (240 characters)',
  INVALID_URL: 'url must be a valid relative path or absolute URL',
  UNSAFE_URL: 'url must be a safe destination',
  MISSING_CREATED_BY: 'createdBy is required',
  CAMPAIGN_NOT_FOUND: 'campaign not found',
  CAMPAIGN_NOT_DRAFT: 'campaign is not in draft status',
  CAMPAIGN_ALREADY_SENT: 'campaign has already been sent',
  CAMPAIGN_CURRENTLY_SENDING: 'campaign is currently being sent',
  NO_ACTIVE_SUBSCRIBERS: 'no active subscribers for this application',
  PUSH_NOT_ENABLED: 'pushNotifications capability not enabled for this application'
})

const TITLE_MAX_LENGTH = 80
const BODY_MAX_LENGTH = 240

const ALLOWED_DOMAINS = [
  'valdi.app',
  'natales.app',
  'puntaarenas.app',
  'coyhaique.app',
  'chiloe.app'
]

export class PushCampaignService {
  #campaignPersistence
  #subscriptionService
  #subscriptionPersistence
  #pushAdapter
  #options

  constructor(options = {}) {
    this.#campaignPersistence = options.campaignPersistence || createPushCampaignPersistence()
    this.#subscriptionPersistence = options.subscriptionPersistence || createPushSubscriptionPersistence()
    this.#subscriptionService = createPushSubscriptionService({ persistence: this.#subscriptionPersistence })
    this.#pushAdapter = options.pushAdapter || null
    this.#options = {
      allowedDomains: options.allowedDomains || ALLOWED_DOMAINS,
      ...options
    }
  }

  setPushAdapter(adapter) {
    this.#pushAdapter = adapter
  }

  #sanitizeText(text) {
    if (!text || typeof text !== 'string') return ''
    return text
      .replace(/[<>]/g, '')
      .trim()
      .substring(0, 240)
  }

  #validateUrl(url, applicationId) {
    if (!url) {
      return { valid: true, url: '' }
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url)
        const domain = parsed.hostname
        if (!this.#options.allowedDomains.includes(domain)) {
          return { valid: false, error: CAMPAIGN_VALIDATION_ERRORS.UNSAFE_URL }
        }
        return { valid: true, url }
      } catch {
        return { valid: false, error: CAMPAIGN_VALIDATION_ERRORS.INVALID_URL }
      }
    }

    if (url.startsWith('/')) {
      return { valid: true, url }
    }

    return { valid: false, error: CAMPAIGN_VALIDATION_ERRORS.INVALID_URL }
  }

  #validateCampaignData(data) {
    const errors = []

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push(CAMPAIGN_VALIDATION_ERRORS.MISSING_TITLE)
    } else if (data.title.length > TITLE_MAX_LENGTH) {
      errors.push(CAMPAIGN_VALIDATION_ERRORS.TITLE_TOO_LONG)
    }

    if (!data.body || typeof data.body !== 'string' || data.body.trim().length === 0) {
      errors.push(CAMPAIGN_VALIDATION_ERRORS.MISSING_BODY)
    } else if (data.body.length > BODY_MAX_LENGTH) {
      errors.push(CAMPAIGN_VALIDATION_ERRORS.BODY_TOO_LONG)
    }

    const urlValidation = this.#validateUrl(data.url, data.applicationId)
    if (!urlValidation.valid) {
      errors.push(urlValidation.error)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async create(environment, applicationId, campaignData, createdBy, authorizedApplicationId = null) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    if (!applicationId) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_APPLICATION_ID }
    }

    if (!createdBy) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_CREATED_BY }
    }

    if (authorizedApplicationId && applicationId !== authorizedApplicationId) {
      return { success: false, error: 'Unauthorized application access' }
    }

    const validation = this.#validateCampaignData(campaignData)
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') }
    }

    const audienceCount = await this.#subscriptionService.getStatus(environment, applicationId)
    if (!audienceCount.success && audienceCount.error === CAMPAIGN_VALIDATION_ERRORS.MISSING_ENVIRONMENT) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.NO_ACTIVE_SUBSCRIBERS }
    }
    if (audienceCount.active === 0) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.NO_ACTIVE_SUBSCRIBERS }
    }

    const campaign = createPushCampaign({
      applicationId,
      environment,
      title: this.#sanitizeText(campaignData.title),
      body: this.#sanitizeText(campaignData.body),
      url: campaignData.url || '/',
      status: CAMPAIGN_STATUS.DRAFT,
      createdBy,
      audienceCount: audienceCount.active
    })

    await this.#campaignPersistence.create(campaign)

    return {
      success: true,
      campaign: campaign.toSafeJSON()
    }
  }

  async get(environment, applicationId, campaignId) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    if (!applicationId) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_APPLICATION_ID }
    }

    const campaign = await this.#campaignPersistence.get(environment, applicationId, campaignId)
    if (!campaign) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.CAMPAIGN_NOT_FOUND }
    }
    if (campaign.environment !== environment) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.CAMPAIGN_NOT_FOUND }
    }
    return { success: true, campaign: campaign.toSafeJSON() }
  }

  async getByApplication(environment, applicationId) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    const campaigns = await this.#campaignPersistence.listRecent(environment, applicationId, 20)
    return { success: true, campaigns }
  }

  async send(environment, applicationId, campaignId, pushAdapter) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=invalid_environment environment=${environment || '(undefined)'}`)
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    if (!applicationId) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=missing_application_id environment=${environment}`)
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_APPLICATION_ID }
    }

    const campaign = await this.#campaignPersistence.get(environment, applicationId, campaignId)
    if (!campaign) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=campaign_not_found environment=${environment} applicationId=${applicationId} campaignId=${campaignId}`)
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.CAMPAIGN_NOT_FOUND }
    }
    if (campaign.environment !== environment) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=campaign_environment_mismatch environment=${environment} campaign_environment=${campaign.environment} campaignId=${campaignId}`)
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.CAMPAIGN_NOT_FOUND }
    }

    if (campaign.status === CAMPAIGN_STATUS.SENT || campaign.status === CAMPAIGN_STATUS.PARTIAL) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=campaign_already_sent environment=${environment} campaignId=${campaignId} status=${campaign.status}`)
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.CAMPAIGN_ALREADY_SENT }
    }

    if (campaign.status === CAMPAIGN_STATUS.SENDING) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=campaign_currently_sending environment=${environment} campaignId=${campaignId}`)
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.CAMPAIGN_CURRENTLY_SENDING }
    }

    const adapter = pushAdapter || this.#pushAdapter
    if (!adapter) {
      console.error(`[PUSH-CAMPAIGN] send rejected reason=adapter_not_configured environment=${environment} campaignId=${campaignId}`)
      return { success: false, error: 'Push adapter not configured' }
    }

    campaign.markSending()
    await this.#campaignPersistence.update(campaign)

    const notification = {
      id: campaign.id,
      applicationId: campaign.applicationId,
      type: 'owner_campaign',
      channels: ['push'],
      payload: {
        title: campaign.title,
        body: campaign.body,
        url: campaign.url,
        notificationId: campaign.id,
        applicationId: campaign.applicationId,
        timestamp: new Date().toISOString()
      }
    }

    try {
      const result = await adapter.send({}, notification)

      campaign.markSent({
        attempted: result.attempted || campaign.audienceCount,
        sent: result.sent || 0,
        failed: result.failed || 0,
        expired: result.expired || 0
      })

      await this.#campaignPersistence.update(campaign)

      return {
        success: true,
        campaign: campaign.toSafeJSON(),
        delivery: {
          attempted: result.attempted || campaign.audienceCount,
          sent: result.sent || 0,
          failed: result.failed || 0,
          expired: result.expired || 0
        }
      }
    } catch (error) {
      campaign.markFailed()
      await this.#campaignPersistence.update(campaign)
      return { success: false, error: error.message }
    }
  }

  async getAudienceCount(environment, applicationId) {
    if (!environment || !Object.values(PUSH_ENVIRONMENTS).includes(environment)) {
      return { success: false, error: CAMPAIGN_VALIDATION_ERRORS.MISSING_ENVIRONMENT }
    }

    const status = await this.#subscriptionService.getStatus(environment, applicationId)
    if (!status.success) {
      return { success: false, error: status.error }
    }
    return {
      success: true,
      active: status.active,
      revoked: status.revoked,
      total: status.active + status.revoked
    }
  }
}

export function createPushCampaignService(options = {}) {
  return new PushCampaignService(options)
}

export default {
  PushCampaignService,
  createPushCampaignService,
  CAMPAIGN_VALIDATION_ERRORS
}
