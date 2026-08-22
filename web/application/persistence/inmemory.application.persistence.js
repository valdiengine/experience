/**
 * In-Memory Application Persistence
 *
 * P15.9.6 - Application Builder Persistence Implementation
 *
 * In-memory implementation for testing without filesystem access.
 * Framework-free implementation.
 */

import { ApplicationPersistence } from './application.persistence.js'
import {
  ApplicationNotFoundError,
  VersionNotFoundError,
  DraftNotFoundError,
  InvalidIdentityError,
  PathTraversalError
} from './persistence.errors.js'
import { deepClone, deepFreeze, makeMutable } from './persistence.serialization.js'

export class InMemoryApplicationPersistence extends ApplicationPersistence {
  constructor(options = {}) {
    super()

    this.#applications = new Map()
    this.#drafts = new Map()
    this.#versions = new Map()
    this.#versionCounts = new Map()
    this.#currentVersions = new Map()
  }

  createApplication(application) {
    const id = this.#normalizeApplicationId(application.identity.domain + application.identity.route)

    if (this.#applications.has(id)) {
      throw new InvalidIdentityError(`Application already exists: ${id}`)
    }

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

    this.#applications.set(id, appRecord)
    this.#versionCounts.set(id, 0)
    this.#currentVersions.set(id, null)

    return id
  }

  getApplication(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)
    const app = this.#applications.get(id)

    if (!app) {
      return null
    }

    return { ...app }
  }

  updateApplication(applicationId, updates) {
    const id = this.#normalizeApplicationId(applicationId)
    const app = this.#applications.get(id)

    if (!app) {
      throw new ApplicationNotFoundError(applicationId)
    }

    Object.assign(app, updates, {
      updatedAt: new Date().toISOString()
    })

    return { ...app }
  }

  deleteApplication(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applications.has(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    this.#applications.delete(id)
    this.#drafts.delete(id)
    this.#versions.delete(id)
    this.#versionCounts.delete(id)
    this.#currentVersions.delete(id)
  }

  listApplications(filters = {}) {
    const results = []

    for (const [id, app] of this.#applications) {
      if (filters.domain && app.identity.domain !== filters.domain) {
        continue
      }
      if (filters.destination && app.destination !== filters.destination) {
        continue
      }
      if (filters.company && app.company !== filters.company) {
        continue
      }

      results.push({
        ...app,
        currentVersionId: this.#currentVersions.get(id)
      })
    }

    return results
  }

  saveDraft(applicationId, draft) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applications.has(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    const draftRecord = {
      applicationId: id,
      ...deepClone(draft),
      updatedAt: new Date().toISOString()
    }

    this.#drafts.set(id, draftRecord)

    return id
  }

  getDraft(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)
    const draft = this.#drafts.get(id)

    if (!draft) {
      return null
    }

    return makeMutable({ ...draft })
  }

  deleteDraft(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#drafts.has(id)) {
      throw new DraftNotFoundError(applicationId)
    }

    this.#drafts.delete(id)
  }

  publishVersion(applicationId, published, options = {}) {
    const id = this.#normalizeApplicationId(applicationId)

    if (!this.#applications.has(id)) {
      throw new ApplicationNotFoundError(applicationId)
    }

    const count = this.#versionCounts.get(id) || 0
    const versionId = `v${count + 1}`

    const versionRecord = deepFreeze({
      versionId,
      applicationId: id,
      ...deepClone(published),
      publishedAt: new Date().toISOString(),
      publishedBy: options.publishedBy || null,
      changes: options.changes || [],
      immutable: true
    })

    if (!this.#versions.has(id)) {
      this.#versions.set(id, new Map())
    }

    this.#versions.get(id).set(versionId, versionRecord)

    this.#versionCounts.set(id, count + 1)
    this.#currentVersions.set(id, versionId)

    this.#applications.get(id).currentVersionId = versionId
    this.#applications.get(id).updatedAt = new Date().toISOString()

    return versionId
  }

  getPublished(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)
    const currentVersionId = this.#currentVersions.get(id)

    if (!currentVersionId) {
      return null
    }

    return this.getVersion(applicationId, currentVersionId)
  }

  getVersion(applicationId, versionId) {
    const id = this.#normalizeApplicationId(applicationId)
    const versions = this.#versions.get(id)

    if (!versions || !versions.has(versionId)) {
      throw new VersionNotFoundError(applicationId, versionId)
    }

    return makeMutable({ ...versions.get(versionId) })
  }

  listVersions(applicationId) {
    const id = this.#normalizeApplicationId(applicationId)
    const versions = this.#versions.get(id)
    const currentVersionId = this.#currentVersions.get(id)

    if (!versions) {
      return []
    }

    const result = []

    for (const [vid, version] of versions) {
      result.push({
        versionId: vid,
        applicationId: id,
        publishedAt: version.publishedAt,
        changes: version.changes || [],
        isCurrent: vid === currentVersionId
      })
    }

    return result.sort((a, b) => a.versionId.localeCompare(b.versionId))
  }

  rollbackVersion(applicationId, versionId, options = {}) {
    const id = this.#normalizeApplicationId(applicationId)

    const targetVersion = this.getVersion(applicationId, versionId)

    const rollbackData = {
      ...targetVersion,
      versionId: undefined,
      publishedAt: undefined,
      immutable: undefined
    }

    return this.publishVersion(applicationId, rollbackData, {
      ...options,
      changes: [`rollback_to_${versionId}`, ...(options.changes || [])]
    })
  }

  #normalizeApplicationId(applicationId) {
    if (!applicationId || typeof applicationId !== 'string') {
      throw new InvalidIdentityError('Application ID must be a non-empty string')
    }

    if (applicationId.includes('..') || applicationId.includes('~')) {
      throw new PathTraversalError(applicationId)
    }

    return applicationId
  }

  #applications
  #drafts
  #versions
  #versionCounts
  #currentVersions
}

export function createInMemoryPersistence(options = {}) {
  return new InMemoryApplicationPersistence(options)
}

export default {
  InMemoryApplicationPersistence,
  createInMemoryPersistence
}
