/**
 * Owner Content Persistence
 *
 * File-based persistence following PUSH-3 pattern.
 * Isolated storage per test run via os.tmpdir().
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { OwnerContent } from '../owner-content.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_BASE_PATH = join(__dirname, '..', '..', 'data', 'owner-content')

export class OwnerContentPersistence {
  #basePath
  #fs
  #index

  constructor(options = {}) {
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#fs = options.fs || { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync }
    this.#index = new Map()
    this.#loadIndex()
  }

  #getDefaultBasePath() {
    return DEFAULT_BASE_PATH
  }

  #loadIndex() {
    this.#index.clear()

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
        const contentFile = join(appPath, 'content.json')

        if (this.#fs.existsSync(contentFile)) {
          try {
            const data = JSON.parse(this.#fs.readFileSync(contentFile, 'utf-8'))
            if (data.applicationId) {
              this.#index.set(data.applicationId, contentFile)
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

  #getContentPath(applicationId) {
    const parts = applicationId.split('/')
    if (parts.length !== 2) {
      throw new Error('Invalid applicationId format')
    }
    const domain = parts[0]
    const routeKey = parts[1].replace(/\//g, '_')
    return join(this.#basePath, domain, routeKey, 'content.json')
  }

  #generateId() {
    return `oc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
  }

  save(content) {
    const applicationId = content.applicationId

    if (!applicationId) {
      throw new Error('applicationId is required')
    }

    const contentPath = this.#getContentPath(applicationId)
    this.#ensureDir(dirname(contentPath))

    const data = content.toSafeJSON()
    if (!data.id) {
      data.id = this.#generateId()
    }

    this.#fs.writeFileSync(contentPath, JSON.stringify(data, null, 2))
    this.#index.set(applicationId, contentPath)

    return data.id
  }

  get(applicationId) {
    const contentPath = this.#index.get(applicationId)

    if (!contentPath || !this.#fs.existsSync(contentPath)) {
      return null
    }

    try {
      const data = JSON.parse(this.#fs.readFileSync(contentPath, 'utf-8'))
      return new OwnerContent(data)
    } catch {
      return null
    }
  }

  exists(applicationId) {
    return this.#index.has(applicationId) && this.#fs.existsSync(this.#index.get(applicationId))
  }

  delete(applicationId) {
    const contentPath = this.#index.get(applicationId)

    if (!contentPath) {
      return false
    }

    try {
      if (this.#fs.existsSync(contentPath)) {
        this.#fs.unlinkSync(contentPath)
      }
      this.#index.delete(applicationId)
      return true
    } catch {
      return false
    }
  }

  listByApplication(applicationId) {
    const content = this.get(applicationId)
    if (!content) {
      return []
    }
    return [content]
  }

  getRevision(applicationId) {
    const content = this.get(applicationId)
    if (!content) {
      return 0
    }
    return content.publishedRevision || 0
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
        const contentFile = join(appPath, 'content.json')

        if (this.#fs.existsSync(contentFile)) {
          try {
            this.#fs.unlinkSync(contentFile)
          } catch {}
        }
      }
    }

    this.#index.clear()
  }
}

export function createOwnerContentPersistence(options = {}) {
  return new OwnerContentPersistence(options)
}

export default {
  OwnerContentPersistence,
  createOwnerContentPersistence
}