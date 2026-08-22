/**
 * Owner Business Persistence
 *
 * File-based persistence for business profile information.
 * Stores owner-updated business details that override canonical config.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_BASE_PATH = join(__dirname, '..', '..', 'data', 'owner-business')

export class OwnerBusinessPersistence {
  #basePath
  #fs
  #cache

  constructor(options = {}) {
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#fs = options.fs || { readFileSync, writeFileSync, mkdirSync, existsSync }
    this.#cache = new Map()
  }

  #getDefaultBasePath() {
    return DEFAULT_BASE_PATH
  }

  #ensureDir(dir) {
    if (!this.#fs.existsSync(dir)) {
      this.#fs.mkdirSync(dir, { recursive: true })
    }
  }

  #getBusinessPath(applicationId) {
    const parts = applicationId.split('/')
    if (parts.length !== 2) {
      throw new Error('Invalid applicationId format')
    }
    const domain = parts[0]
    const routeKey = parts[1].replace(/\//g, '_')
    return join(this.#basePath, domain, routeKey, 'business.json')
  }

  save(applicationId, businessData) {
    if (!applicationId) {
      throw new Error('applicationId is required')
    }

    const businessPath = this.#getBusinessPath(applicationId)
    this.#ensureDir(dirname(businessPath))

    const data = {
      applicationId,
      ...businessData,
      updatedAt: new Date().toISOString()
    }

    this.#fs.writeFileSync(businessPath, JSON.stringify(data, null, 2))
    this.#cache.set(applicationId, data)

    return data
  }

  get(applicationId) {
    if (!applicationId) {
      return null
    }

    if (this.#cache.has(applicationId)) {
      return this.#cache.get(applicationId)
    }

    const businessPath = this.#getBusinessPath(applicationId)

    if (!this.#fs.existsSync(businessPath)) {
      return null
    }

    try {
      const data = JSON.parse(this.#fs.readFileSync(businessPath, 'utf-8'))
      this.#cache.set(applicationId, data)
      return data
    } catch {
      return null
    }
  }

  delete(applicationId) {
    if (!applicationId) {
      return false
    }

    const businessPath = this.#getBusinessPath(applicationId)

    try {
      if (this.#fs.existsSync(businessPath)) {
        this.#fs.unlinkSync(businessPath)
      }
      this.#cache.delete(applicationId)
      return true
    } catch {
      return false
    }
  }

  clear() {
    this.#cache.clear()
  }
}

export function createOwnerBusinessPersistence(options = {}) {
  return new OwnerBusinessPersistence(options)
}

export default {
  OwnerBusinessPersistence,
  createOwnerBusinessPersistence
}
