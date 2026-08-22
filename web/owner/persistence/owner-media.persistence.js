/**
 * Owner Media Persistence
 *
 * File-based persistence following PUSH-3 pattern.
 * Isolated storage per test run via os.tmpdir().
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { OwnerMedia } from '../owner-media.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_BASE_PATH = join(__dirname, '..', '..', 'data', 'owner-media')

export class OwnerMediaPersistence {
  #basePath
  #fs
  #index
  #mediaStore

  constructor(options = {}) {
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#fs = options.fs || { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync }
    this.#index = new Map()
    this.#mediaStore = new Map()
    this.#loadIndex()
  }

  #getDefaultBasePath() {
    return DEFAULT_BASE_PATH
  }

  #loadIndex() {
    this.#index.clear()
    this.#mediaStore.clear()

    if (!this.#fs.existsSync(this.#basePath)) {
      return
    }

    const domains = this.#fs.readdirSync(this.#basePath)

    for (const domain of domains) {
      const domainPath = join(this.#basePath, domain)

      if (!this.#fs.existsSync(domainPath)) continue

      const apps = this.#fs.readdirSync(domainPath)

      for (const appKey of apps) {
        const appPath = join(domainPath, appKey)
        const mediaIndexFile = join(appPath, 'media-index.json')

        if (this.#fs.existsSync(mediaIndexFile)) {
          try {
            const indexData = JSON.parse(this.#fs.readFileSync(mediaIndexFile, 'utf-8'))
            const applicationId = indexData.applicationId

            if (applicationId && indexData.media) {
              for (const mediaData of indexData.media) {
                this.#index.set(mediaData.id, { applicationId, path: join(appPath, `${mediaData.id}.json`) })
                this.#mediaStore.set(mediaData.id, new OwnerMedia(mediaData))
              }
            }
          } catch {}
        }
      }
    }
  }

  #ensureDir(dir) {
    if (!this.#fs.existsSync(dir)) {
      this.#fs.mkdirSync(dir, { recursive: true })
    }
  }

  #getMediaIndexPath(applicationId) {
    const parts = applicationId.split('/')
    if (parts.length !== 2) {
      throw new Error('Invalid applicationId format')
    }
    const domain = parts[0]
    const routeKey = parts[1].replace(/\//g, '_')
    return join(this.#basePath, domain, routeKey)
  }

  #generateId() {
    return `media_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }

  save(media) {
    const applicationId = media.applicationId

    if (!applicationId) {
      throw new Error('applicationId is required')
    }

    const indexPath = this.#getMediaIndexPath(applicationId)
    this.#ensureDir(indexPath)

    const data = media.toSafeJSON()
    if (!data.id) {
      data.id = this.#generateId()
    }

    const mediaPath = join(indexPath, `${data.id}.json`)
    this.#fs.writeFileSync(mediaPath, JSON.stringify(data, null, 2))

    this.#updateIndex(applicationId, data)
    this.#index.set(data.id, { applicationId, path: mediaPath })
    this.#mediaStore.set(data.id, media)

    return data.id
  }

  #updateIndex(applicationId, mediaData) {
    const indexPath = join(this.#getMediaIndexPath(applicationId), 'media-index.json')
    let indexData = { applicationId, media: [] }

    if (this.#fs.existsSync(indexPath)) {
      try {
        indexData = JSON.parse(this.#fs.readFileSync(indexPath, 'utf-8'))
      } catch {}
    }

    const existingIndex = indexData.media.findIndex(m => m.id === mediaData.id)
    if (existingIndex >= 0) {
      indexData.media[existingIndex] = mediaData
    } else {
      indexData.media.push(mediaData)
    }

    this.#fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2))
  }

  get(mediaId) {
    const entry = this.#index.get(mediaId)

    if (!entry || !this.#fs.existsSync(entry.path)) {
      return null
    }

    try {
      const data = JSON.parse(this.#fs.readFileSync(entry.path, 'utf-8'))
      return new OwnerMedia(data)
    } catch {
      return null
    }
  }

  getByApplication(applicationId) {
    const results = []
    const indexPath = join(this.#getMediaIndexPath(applicationId), 'media-index.json')

    if (!this.#fs.existsSync(indexPath)) {
      return results
    }

    try {
      const indexData = JSON.parse(this.#fs.readFileSync(indexPath, 'utf-8'))
      for (const mediaData of indexData.media) {
        results.push(new OwnerMedia(mediaData))
      }
    } catch {}

    return results.sort((a, b) => {
      if (a.galleryOrder !== null && b.galleryOrder !== null) {
        return a.galleryOrder - b.galleryOrder
      }
      if (a.galleryOrder !== null) return -1
      if (b.galleryOrder !== null) return 1
      return new Date(a.createdAt) - new Date(b.createdAt)
    })
  }

  exists(mediaId) {
    const entry = this.#index.get(mediaId)
    return entry && this.#fs.existsSync(entry.path)
  }

  delete(mediaId) {
    const entry = this.#index.get(mediaId)

    if (!entry) {
      return false
    }

    try {
      if (this.#fs.existsSync(entry.path)) {
        this.#fs.unlinkSync(entry.path)
      }

      const indexPath = join(this.#getMediaIndexPath(entry.applicationId), 'media-index.json')
      if (this.#fs.existsSync(indexPath)) {
        const indexData = JSON.parse(this.#fs.readFileSync(indexPath, 'utf-8'))
        indexData.media = indexData.media.filter(m => m.id !== mediaId)
        this.#fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2))
      }

      this.#index.delete(mediaId)
      this.#mediaStore.delete(mediaId)
      return true
    } catch {
      return false
    }
  }

  getFeaturedImage(applicationId) {
    const mediaList = this.getByApplication(applicationId)
    return mediaList.find(m => m.isFeatured) || null
  }

  setFeatured(mediaId, applicationId) {
    const mediaList = this.getByApplication(applicationId)

    for (const media of mediaList) {
      if (media.id === mediaId) {
        media.setAsFeatured()
      } else if (media.isFeatured) {
        media.removeAsFeatured()
      }
      this.#updateIndex(applicationId, media.toSafeJSON())
    }
  }

  removeFeatured(applicationId) {
    const mediaList = this.getByApplication(applicationId)

    for (const media of mediaList) {
      if (media.isFeatured) {
        media.removeAsFeatured()
        this.#updateIndex(applicationId, media.toSafeJSON())
      }
    }
  }

  updateGalleryOrder(applicationId, mediaIds) {
    const mediaList = this.getByApplication(applicationId)
    const idSet = new Set(mediaIds)

    if (idSet.size !== mediaIds.length) {
      return { success: false, error: 'Duplicate media IDs in order list' }
    }

    for (const media of mediaList) {
      if (idSet.has(media.id)) {
        const order = mediaIds.indexOf(media.id)
        media.setGalleryOrder(order)
      } else {
        media.setGalleryOrder(null)
      }
      this.#updateIndex(applicationId, media.toSafeJSON())
    }

    return { success: true }
  }

  isReferenced(mediaId) {
    const media = this.get(mediaId)
    if (!media) return false

    const appMedia = this.getByApplication(media.applicationId)
    return appMedia.some(m => m.id === mediaId && (m.isFeatured || m.galleryOrder !== null))
  }

  clear() {
    if (!this.#fs.existsSync(this.#basePath)) {
      return
    }

    const domains = this.#fs.readdirSync(this.#basePath)

    for (const domain of domains) {
      const domainPath = join(this.#basePath, domain)

      if (!this.#fs.existsSync(domainPath)) continue

      const apps = this.#fs.readdirSync(domainPath)

      for (const appKey of apps) {
        const appPath = join(domainPath, appKey)

        if (!this.#fs.existsSync(appPath)) continue

        const files = this.#fs.readdirSync(appPath)

        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              this.#fs.unlinkSync(join(appPath, file))
            } catch {}
          }
        }
      }
    }

    this.#index.clear()
    this.#mediaStore.clear()
  }
}

export function createOwnerMediaPersistence(options = {}) {
  return new OwnerMediaPersistence(options)
}

export default {
  OwnerMediaPersistence,
  createOwnerMediaPersistence
}