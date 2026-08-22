/**
 * File-Based Application Persistence
 *
 * P15.9.6 - Application Builder Persistence Implementation
 *
 * Filesystem-based implementation using native Node.js APIs only.
 *
 * Storage Structure:
 *   {basePath}/
 *   └── {domain}/
 *       └── {route-key}/
 *           ├── application.json
 *           ├── draft.json
 *           └── versions/
 *               ├── v1.json
 *               ├── v2.json
 *               └── v3.json
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { ApplicationPersistence, validateApplicationId, validateVersionId } from './application.persistence.js'
import {
  ApplicationNotFoundError,
  VersionNotFoundError,
  DraftNotFoundError,
  InvalidIdentityError,
  PathTraversalError,
  StorageError
} from './persistence.errors.js'
import { deepClone, deepFreeze, makeMutable, serialize, deserialize } from './persistence.serialization.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class FileApplicationPersistence extends ApplicationPersistence {
  #basePath
  #fs

  constructor(options = {}) {
    super()

    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#fs = options.fs || { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync }
  }

  #getDefaultBasePath() {
    return join(__dirname, '..', '..', '..', 'data', 'applications')
  }

  createApplication(application) {
    const id = this.#normalizeApplicationId(application.identity.domain + application.identity.route)

    if (this.#applications.has(id)) {
      throw new InvalidIdentityError(`Application already exists: ${id}`)
    }

    const dir = this.#getApplicationDir(id)
    this.#ensureDir(dir)

    const appRecord = {
      applicationId: id,
      identity: {
        domain: application.identity.domain,
        route: application.identity.route
      },
      destination: application.destination || null,
      company: application.company || null,
      type: application.type || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const appPath = this.#getApplicationPath(id, 'application.json')
    this.#writeJson(appPath, appRecord)

    this.#applications.set(id, true)
    this.#versionCounts.set(id, 0)
    this.#currentVersions.set(id, null)

    return id
  }

  getApplication(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applicationExists(id)) {
      return null
    }

    const appPath = this.#getApplicationPath(id, 'application.json')
    const app = this.#readJson(appPath)

    if (!app) {
      return null
    }

    return {
      ...app,
      currentVersionId: this.#currentVersions.get(id) || app.currentVersionId || null
    }
  }

  updateApplication(applicationId, updates) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applicationExists(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    const appPath = this.#getApplicationPath(id, 'application.json')
    const app = this.#readJson(appPath)

    Object.assign(app, updates, {
      updatedAt: new Date().toISOString()
    })

    this.#writeJson(appPath, app)

    return { ...app }
  }

  deleteApplication(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applicationExists(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    const dir = this.#getApplicationDir(id)

    this.#deleteRecursive(dir)

    this.#applications.delete(id)
    this.#drafts.delete(id)
    this.#versions.delete(id)
    this.#versionCounts.delete(id)
    this.#currentVersions.delete(id)
  }

  listApplications(filters = {}) {
    const results = []
    const baseDir = this.#getBaseDir()

    if (!this.#fs.existsSync(baseDir)) {
      return results
    }

    const domains = this.#fs.readdirSync(baseDir)

    for (const domain of domains) {
      if (!this.#isValidDomain(domain)) {
        continue
      }

      const domainDir = join(baseDir, domain)

      try {
        const routes = this.#fs.readdirSync(domainDir)

        for (const routeKey of routes) {
          const routeDir = join(domainDir, routeKey)
          const stats = this.#fs.statSync(routeDir)

          if (!stats.isDirectory()) {
            continue
          }

          const appPath = join(routeDir, 'application.json')

          if (!this.#fs.existsSync(appPath)) {
            continue
          }

          const app = this.#readJson(appPath)

          if (!app) {
            continue
          }

          if (filters.domain && app.identity.domain !== filters.domain) {
            continue
          }
          if (filters.destination && app.destination !== filters.destination) {
            continue
          }
          if (filters.company && app.company !== filters.company) {
            continue
          }

          const applicationId = `${app.identity.domain}${app.identity.route}`

          results.push({
            ...app,
            currentVersionId: this.#currentVersions.get(applicationId) || app.currentVersionId || null
          })
        }
      } catch (error) {
        continue
      }
    }

    return results
  }

  saveDraft(applicationId, draft) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applicationExists(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    const draftRecord = {
      applicationId: id,
      ...deepClone(draft),
      updatedAt: new Date().toISOString()
    }

    const draftPath = this.#getApplicationPath(id, 'draft.json')
    this.#writeJson(draftPath, draftRecord)

    this.#drafts.set(id, true)

    return id
  }

  getDraft(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#draftExists(id)) {
      return null
    }

    const draftPath = this.#getApplicationPath(id, 'draft.json')
    const draft = this.#readJson(draftPath)

    return makeMutable({ ...draft })
  }

  deleteDraft(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#draftExists(id)) {
      throw new DraftNotFoundError(applicationId)
    }

    const draftPath = this.#getApplicationPath(id, 'draft.json')
    this.#fs.unlinkSync(draftPath)

    this.#drafts.delete(id)
  }

  publishVersion(applicationId, published, options = {}) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applicationExists(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    const count = this.#getVersionCount(id)
    const versionId = `v${count + 1}`

    const versionsDir = this.#getVersionsDir(id)
    this.#ensureDir(versionsDir)

    const versionRecord = deepFreeze({
      versionId,
      applicationId: id,
      ...deepClone(published),
      publishedAt: new Date().toISOString(),
      publishedBy: options.publishedBy || null,
      changes: options.changes || [],
      immutable: true
    })

    const versionPath = join(versionsDir, `${versionId}.json`)
    this.#writeJson(versionPath, versionRecord)

    this.#setVersionCount(id, count + 1)
    this.#setCurrentVersion(id, versionId)

    const appPath = this.#getApplicationPath(id, 'application.json')
    const app = this.#readJson(appPath)
    app.currentVersionId = versionId
    app.updatedAt = new Date().toISOString()
    this.#writeJson(appPath, app)

    return versionId
  }

  getPublished(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)
    const currentVersionId = this.#getCurrentVersion(id)

    if (!currentVersionId) {
      return null
    }

    return this.getVersion(applicationId, currentVersionId)
  }

  getVersion(applicationId, versionId) {
    const id = this.#normalizeApplicationId(applicationId)

    const versionIdValidation = validateVersionId(versionId)
    if (!versionIdValidation.valid) {
      throw new InvalidIdentityError(versionIdValidation.error)
    }

    if (!this.#versionExists(id, versionId)) {
      throw new VersionNotFoundError(applicationId, versionId)
    }

    const versionPath = this.#getVersionPath(id, versionId)
    const version = this.#readJson(versionPath)

    return makeMutable({ ...version })
  }

  listVersions(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)
    const currentVersionId = this.#getCurrentVersion(id)

    if (!this.#versionExists(id, 'v1')) {
      return []
    }

    const versionsDir = this.#getVersionsDir(id)
    const files = this.#fs.readdirSync(versionsDir)

    const result = []

    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue
      }

      const versionId = file.replace('.json', '')
      const versionPath = join(versionsDir, file)

      try {
        const version = this.#readJson(versionPath)

        if (version) {
          result.push({
            versionId: version.versionId,
            applicationId: id,
            publishedAt: version.publishedAt,
            changes: version.changes || [],
            isCurrent: versionId === currentVersionId
          })
        }
      } catch (error) {
        continue
      }
    }

    return result.sort((a, b) => a.versionId.localeCompare(b.versionId))
  }

  rollbackVersion(applicationId, versionId, options = {}) {
    const id = this.#normalizeApplicationId(applicationId)

    const targetVersion = this.getVersion(applicationId, versionId)

    const rollbackData = { ...targetVersion }
    delete rollbackData.versionId
    delete rollbackData.publishedAt
    delete rollbackData.immutable

    return this.publishVersion(applicationId, rollbackData, {
      ...options,
      changes: [`rollback_to_${versionId}`, ...(options.changes || [])]
    })
  }

  #getBaseDir() {
    return this.#basePath
  }

  #getApplicationDir(applicationId) {
    const { domain, routeKey } = this.#parseApplicationId(applicationId)
    return join(this.#getBaseDir(), domain, routeKey)
  }

  #getVersionsDir(applicationId) {
    return join(this.#getApplicationDir(applicationId), 'versions')
  }

  #getApplicationPath(applicationId, filename) {
    return join(this.#getApplicationDir(applicationId), filename)
  }

  #getVersionPath(applicationId, versionId) {
    return join(this.#getVersionsDir(applicationId), `${versionId}.json`)
  }

  #normalizeApplicationId(applicationId) {
    if (!applicationId || typeof applicationId !== 'string') {
      throw new InvalidIdentityError('Application ID must be a non-empty string')
    }

    if (applicationId.includes('..') || applicationId.includes('~')) {
      throw new PathTraversalError(applicationId)
    }

    if (applicationId.includes('%') || applicationId.includes('\0')) {
      throw new PathTraversalError(applicationId)
    }

    return applicationId
  }

  #parseApplicationId(applicationId) {
    const firstSlash = applicationId.indexOf('/')

    if (firstSlash === -1) {
      throw new InvalidIdentityError('Application ID must be in format: domain/route')
    }

    const domain = applicationId.substring(0, firstSlash)
    const route = applicationId.substring(firstSlash)

    const routeKey = this.#routeToKey(route)

    return { domain, route, routeKey }
  }

  #routeToKey(route) {
    return route.replace(/^\//, '').replace(/\//g, '_')
  }

  #isValidDomain(domain) {
    const validDomains = ['valdi.app', 'natales.app', 'puntaarenas.app', 'coyhaique.app', 'chiloe.app']
    return validDomains.includes(domain)
  }

  #ensureDir(dir) {
    if (!this.#fs.existsSync(dir)) {
      this.#fs.mkdirSync(dir, { recursive: true })
    }
  }

  #deleteRecursive(dir) {
    if (!this.#fs.existsSync(dir)) {
      return
    }

    const entries = this.#fs.readdirSync(dir)

    for (const entry of entries) {
      const entryPath = join(dir, entry)
      const stats = this.#fs.statSync(entryPath)

      if (stats.isDirectory()) {
        this.#deleteRecursive(entryPath)
      } else {
        this.#fs.unlinkSync(entryPath)
      }
    }

    this.#fs.unlinkSync(dir)
  }

  #applicationExists(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (this.#applications.has(id)) {
      return true
    }

    const appPath = this.#getApplicationPath(id, 'application.json')
    return this.#fs.existsSync(appPath)
  }

  #draftExists(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (this.#drafts.has(id)) {
      return true
    }

    const draftPath = this.#getApplicationPath(id, 'draft.json')
    return this.#fs.existsSync(draftPath)
  }

  #versionExists(applicationId, versionId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (this.#versions.has(id) && this.#versions.get(id).has(versionId)) {
      return true
    }

    const versionPath = this.#getVersionPath(id, versionId)
    return this.#fs.existsSync(versionPath)
  }

  #getVersionCount(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (this.#versionCounts.has(id)) {
      return this.#versionCounts.get(id)
    }

    const versionsDir = this.#getVersionsDir(id)

    if (!this.#fs.existsSync(versionsDir)) {
      return 0
    }

    const files = this.#fs.readdirSync(versionsDir)
    let maxVersion = 0

    for (const file of files) {
      if (file.endsWith('.json')) {
        const versionId = file.replace('.json', '')
        const match = versionId.match(/^v(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxVersion) {
            maxVersion = num
          }
        }
      }
    }

    this.#versionCounts.set(id, maxVersion)
    return maxVersion
  }

  #setVersionCount(applicationId, count) {
    const id = this.#normalizeApplicationId(applicationId)
    this.#versionCounts.set(id, count)
  }

  #getCurrentVersion(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (this.#currentVersions.has(id)) {
      return this.#currentVersions.get(id)
    }

    const app = this.getApplication(applicationId)
    return app?.currentVersionId || null
  }

  #setCurrentVersion(applicationId, versionId) {
    const id = this.#normalizeApplicationId(applicationId)
    this.#currentVersions.set(id, versionId)
  }

  #readJson(filePath) {
    try {
      const content = this.#fs.readFileSync(filePath, 'utf8')
      return deserialize(content)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw new StorageError(`Failed to read ${filePath}: ${error.message}`)
    }
  }

  #writeJson(filePath, data) {
    try {
      const content = serialize(data)
      const tempPath = filePath + '.tmp'

      this.#ensureDir(dirname(filePath))

      this.#fs.writeFileSync(tempPath, content, 'utf8')
      this.#fs.renameSync(tempPath, filePath)
    } catch (error) {
      throw new StorageError(`Failed to write ${filePath}: ${error.message}`)
    }
  }

  #applications = new Map()
  #drafts = new Map()
  #versions = new Map()
  #versionCounts = new Map()
  #currentVersions = new Map()
}

export function createFilePersistence(options = {}) {
  return new FileApplicationPersistence(options)
}

export default {
  FileApplicationPersistence,
  createFilePersistence
}
