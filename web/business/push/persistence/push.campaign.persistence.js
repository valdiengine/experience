/**
 * PUSH-3 — Push Campaign Persistence
 *
 * File-based persistence for push notification campaigns.
 * Maintains Environment-scoped + Application-scoped isolation for all campaign data.
 *
 * Storage Structure:
 *   data/push-campaigns/
 *   └── {environment}/
 *       └── {applicationId}/
 *           └── campaigns/
 *               ├── index.json (campaign index)
 *               └── {campaignId}.json (individual campaign)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PushCampaign, PUSH_ENVIRONMENTS } from '../push.campaign.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class PushCampaignPersistence {
  #basePath
  #campaigns

  constructor(options = {}) {
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#campaigns = new Map()
  }

  #getDefaultBasePath() {
    return join(__dirname, '..', '..', '..', 'data', 'push-campaigns')
  }

  #getCampaignDir(environment, applicationId) {
    return join(this.#basePath, environment, applicationId.replace('/', '_'), 'campaigns')
  }

  #ensureDir(dir) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  #getIndexPath(environment, applicationId) {
    return join(this.#getCampaignDir(environment, applicationId), 'index.json')
  }

  #getCampaignPath(environment, applicationId, campaignId) {
    return join(this.#getCampaignDir(environment, applicationId), `${campaignId}.json`)
  }

  #validateApplicationId(applicationId) {
    if (!applicationId || typeof applicationId !== 'string') {
      return false
    }
    if (applicationId.includes('..') || applicationId.includes('\\')) {
      return false
    }
    if (!applicationId.includes('/')) {
      return false
    }
    return true
  }

  async create(campaign) {
    if (!this.#validateApplicationId(campaign.applicationId)) {
      throw new Error('Invalid applicationId')
    }

    const environment = campaign.environment
    const dir = this.#getCampaignDir(environment, campaign.applicationId)
    this.#ensureDir(dir)

    const campaignPath = this.#getCampaignPath(environment, campaign.applicationId, campaign.id)
    writeFileSync(campaignPath, JSON.stringify(campaign.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(environment, campaign.applicationId)
    let index = this.#loadIndex(environment, campaign.applicationId)
    index[campaign.id] = {
      id: campaign.id,
      status: campaign.status,
      title: campaign.title,
      createdAt: campaign.createdAt,
      sentAt: campaign.sentAt
    }
    writeFileSync(indexPath, JSON.stringify(index, null, 2))

    this.#campaigns.set(campaign.id, campaign)

    return campaign
  }

  async update(campaign) {
    if (!this.#validateApplicationId(campaign.applicationId)) {
      throw new Error('Invalid applicationId')
    }

    const environment = campaign.environment
    const campaignPath = this.#getCampaignPath(environment, campaign.applicationId, campaign.id)
    writeFileSync(campaignPath, JSON.stringify(campaign.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(environment, campaign.applicationId)
    let index = this.#loadIndex(environment, campaign.applicationId)
    if (index[campaign.id]) {
      index[campaign.id].status = campaign.status
      index[campaign.id].title = campaign.title
      index[campaign.id].sentAt = campaign.sentAt
      index[campaign.id].updatedAt = new Date().toISOString()
      writeFileSync(indexPath, JSON.stringify(index, null, 2))
    }

    this.#campaigns.set(campaign.id, campaign)

    return campaign
  }

  async get(environment, applicationId, campaignId) {
    if (!this.#validateApplicationId(applicationId)) {
      return null
    }

    if (this.#campaigns.has(campaignId)) {
      const cached = this.#campaigns.get(campaignId)
      if (cached.environment === environment && cached.applicationId === applicationId) {
        return cached
      }
    }

    const campaignPath = this.#getCampaignPath(environment, applicationId, campaignId)
    if (!existsSync(campaignPath)) {
      return null
    }

    try {
      const data = JSON.parse(readFileSync(campaignPath, 'utf-8'))
      const campaign = PushCampaign.fromLegacyJSON(data)
      this.#campaigns.set(campaignId, campaign)
      return campaign
    } catch {
      return null
    }
  }

  async getByApplication(environment, applicationId) {
    if (!this.#validateApplicationId(applicationId)) {
      throw new Error('Invalid applicationId')
    }

    const index = this.#loadIndex(environment, applicationId)
    const campaigns = []

    for (const campaignId of Object.keys(index)) {
      const campaignPath = this.#getCampaignPath(environment, applicationId, campaignId)
      if (existsSync(campaignPath)) {
        const data = JSON.parse(readFileSync(campaignPath, 'utf-8'))
        const campaign = PushCampaign.fromLegacyJSON(data)
        this.#campaigns.set(campaignId, campaign)
        campaigns.push(campaign.toSafeJSON())
      }
    }

    return campaigns
  }

  async listRecent(environment, applicationId, limit = 10) {
    if (!this.#validateApplicationId(applicationId)) {
      throw new Error('Invalid applicationId')
    }

    const index = this.#loadIndex(environment, applicationId)
    const entries = Object.values(index)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)

    const campaigns = []
    for (const entry of entries) {
      const campaignPath = this.#getCampaignPath(environment, applicationId, entry.id)
      if (existsSync(campaignPath)) {
        const data = JSON.parse(readFileSync(campaignPath, 'utf-8'))
        const campaign = PushCampaign.fromLegacyJSON(data)
        this.#campaigns.set(entry.id, campaign)
        campaigns.push(campaign.toSafeJSON())
      }
    }

    return campaigns
  }

  #loadIndex(environment, applicationId) {
    const indexPath = this.#getIndexPath(environment, applicationId)
    if (!existsSync(indexPath)) {
      return {}
    }
    try {
      return JSON.parse(readFileSync(indexPath, 'utf-8'))
    } catch {
      return {}
    }
  }
}

export function createPushCampaignPersistence(options = {}) {
  return new PushCampaignPersistence(options)
}

export default {
  PushCampaignPersistence,
  createPushCampaignPersistence
}
