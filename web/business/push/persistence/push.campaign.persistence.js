/**
 * PUSH-3 — Push Campaign Persistence
 *
 * File-based persistence for push notification campaigns.
 * Maintains Application-scoped isolation for all campaign data.
 *
 * Storage Structure:
 *   data/push-campaigns/
 *   └── {applicationId}/
 *       └── campaigns/
 *           ├── index.json (campaign index)
 *           └── {campaignId}.json (individual campaign)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PushCampaign } from '../push.campaign.model.js'

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

  #getCampaignDir(applicationId) {
    return join(this.#basePath, applicationId.replace('/', '_'), 'campaigns')
  }

  #ensureDir(dir) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  #getIndexPath(applicationId) {
    return join(this.#getCampaignDir(applicationId), 'index.json')
  }

  #getCampaignPath(applicationId, campaignId) {
    return join(this.#getCampaignDir(applicationId), `${campaignId}.json`)
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

    const dir = this.#getCampaignDir(campaign.applicationId)
    this.#ensureDir(dir)

    const campaignPath = this.#getCampaignPath(campaign.applicationId, campaign.id)
    writeFileSync(campaignPath, JSON.stringify(campaign.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(campaign.applicationId)
    let index = this.#loadIndex(campaign.applicationId)
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

    const campaignPath = this.#getCampaignPath(campaign.applicationId, campaign.id)
    writeFileSync(campaignPath, JSON.stringify(campaign.toJSON(), null, 2))

    const indexPath = this.#getIndexPath(campaign.applicationId)
    let index = this.#loadIndex(campaign.applicationId)
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

  async get(campaignId) {
    if (this.#campaigns.has(campaignId)) {
      return this.#campaigns.get(campaignId)
    }

    const index = this.#loadAllIndexes()
    for (const [appId, indexData] of Object.entries(index)) {
      if (indexData[campaignId]) {
        const campaignPath = this.#getCampaignPath(appId, campaignId)
        if (existsSync(campaignPath)) {
          const data = JSON.parse(readFileSync(campaignPath, 'utf-8'))
          const campaign = PushCampaign.fromJSON(data)
          this.#campaigns.set(campaignId, campaign)
          return campaign
        }
      }
    }

    return null
  }

  async getByApplication(applicationId) {
    if (!this.#validateApplicationId(applicationId)) {
      throw new Error('Invalid applicationId')
    }

    const index = this.#loadIndex(applicationId)
    const campaigns = []

    for (const campaignId of Object.keys(index)) {
      const campaign = await this.get(campaignId)
      if (campaign) {
        campaigns.push(campaign.toSafeJSON())
      }
    }

    return campaigns
  }

  async listRecent(applicationId, limit = 10) {
    if (!this.#validateApplicationId(applicationId)) {
      throw new Error('Invalid applicationId')
    }

    const index = this.#loadIndex(applicationId)
    const entries = Object.values(index)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)

    const campaigns = []
    for (const entry of entries) {
      const campaign = await this.get(entry.id)
      if (campaign) {
        campaigns.push(campaign.toSafeJSON())
      }
    }

    return campaigns
  }

  #loadIndex(applicationId) {
    const indexPath = this.#getIndexPath(applicationId)
    if (!existsSync(indexPath)) {
      return {}
    }
    try {
      return JSON.parse(readFileSync(indexPath, 'utf-8'))
    } catch {
      return {}
    }
  }

  #loadAllIndexes() {
    const indexes = {}
    if (!existsSync(this.#basePath)) {
      return indexes
    }
    const entries = readdirSync(this.#basePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const indexPath = join(this.#basePath, entry.name, 'campaigns', 'index.json')
        if (existsSync(indexPath)) {
          try {
            indexes[entry.name] = JSON.parse(readFileSync(indexPath, 'utf-8'))
          } catch {
            indexes[entry.name] = {}
          }
        }
      }
    }
    return indexes
  }
}

export function createPushCampaignPersistence(options = {}) {
  return new PushCampaignPersistence(options)
}

export default {
  PushCampaignPersistence,
  createPushCampaignPersistence
}
