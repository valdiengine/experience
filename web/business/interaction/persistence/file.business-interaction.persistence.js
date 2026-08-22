/**
 * P15.11.1 — Business Interaction Core & Application Inbox Architecture
 *
 * File-based persistence for BusinessInteraction.
 *
 * Storage structure:
 *   {basePath}/
 *   └── {domain}/
 *       └── {route-key}/
 *           └── interactions/
 *               ├── {interaction-id}.json
 *               └── history/
 *                   └── {interaction-id}.json
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { BusinessInteractionPersistence, validateInteractionId } from './business-interaction.persistence.js'
import {
  InteractionNotFoundError,
  InteractionPathTraversalError,
  InteractionSerializationError,
  InteractionStorageError,
  InteractionConcurrencyError,
  DuplicateInteractionError
} from '../business-interaction.errors.js'
import { BusinessInteraction, INTERACTION_STATUS, INTERACTION_ENVIRONMENTS } from '../business-interaction.model.js'
import { VALID_STATUS_TRANSITIONS } from '../business-interaction.model.js'
import { CANONICAL_DOMAINS } from '../../../application/application.identity.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class FileBusinessInteractionPersistence extends BusinessInteractionPersistence {
  #basePath
  #fs
  #cache

  constructor(options = {}) {
    super()
    this.#basePath = options.basePath || this.#getDefaultBasePath()
    this.#fs = options.fs || { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync }
    this.#cache = new Map()
  }

  #getDefaultBasePath() {
    return join(__dirname, '..', '..', '..', '..', 'data', 'interactions')
  }

  create(interactionData) {
    const interaction = new BusinessInteraction(interactionData)

    if (this.exists(interaction.id)) {
      throw new DuplicateInteractionError(interaction.id)
    }

    const dir = this.#getInteractionDir(interaction.applicationId)
    this.#ensureDir(dir)

    const interactionPath = this.#getInteractionPath(interaction.applicationId, interaction.id)
    this.#writeJson(interactionPath, interaction.toJSON())

    this.#cache.set(interaction.id, interaction.toJSON())

    const historyPath = this.#getHistoryPath(interaction.applicationId, interaction.id)
    this.#ensureDir(dirname(historyPath))
    this.#writeJson(historyPath, {
      entries: [],
      interactionId: interaction.id,
      createdAt: new Date().toISOString()
    })

    return interaction.toJSON()
  }

  get(interactionId) {
    const idValidation = validateInteractionId(interactionId)
    if (!idValidation.valid) {
      throw new InteractionPathTraversalError(interactionId)
    }

    if (this.#cache.has(interactionId)) {
      return { ...this.#cache.get(interactionId) }
    }

    const dirs = this.#findInteractionDirs()
    for (const dir of dirs) {
      const interactionPath = join(dir, `${interactionId}.json`)
      if (this.#fs.existsSync(interactionPath)) {
        const interaction = this.#readJson(interactionPath)
        if (interaction) {
          this.#cache.set(interactionId, interaction)
          return { ...interaction }
        }
      }
    }

    return null
  }

  update(interactionId, updates) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new InteractionNotFoundError(interactionId)
    }

    if (updates.version && updates.version !== existing.version) {
      throw new InteractionConcurrencyError(interactionId, 'Version mismatch')
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    }

    const interactionPath = this.#getInteractionPath(existing.applicationId, interactionId)
    this.#writeJson(interactionPath, updated)
    this.#cache.set(interactionId, updated)

    return { ...updated }
  }

  delete(interactionId) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new InteractionNotFoundError(interactionId)
    }

    const interactionPath = this.#getInteractionPath(existing.applicationId, interactionId)
    const historyPath = this.#getHistoryPath(existing.applicationId, interactionId)

    if (this.#fs.existsSync(interactionPath)) {
      this.#fs.unlinkSync(interactionPath)
    }

    if (this.#fs.existsSync(historyPath)) {
      this.#fs.unlinkSync(historyPath)
    }

    this.#cache.delete(interactionId)

    return true
  }

  list(applicationId, filters = {}) {
    const dir = this.#getInteractionDir(applicationId)

    if (!this.#fs.existsSync(dir)) {
      return []
    }

    const files = this.#fs.readdirSync(dir)
    const interactions = []

    for (const file of files) {
      if (!file.endsWith('.json') || file === 'index.json') {
        continue
      }

      const interactionId = file.replace('.json', '')
      const idValidation = validateInteractionId(interactionId)
      if (!idValidation.valid) {
        continue
      }

      try {
        const interaction = this.get(interactionId)
        if (!interaction) {
          continue
        }

        if (filters.type && interaction.type !== filters.type) {
          continue
        }

        if (filters.status && interaction.status !== filters.status) {
          continue
        }

        if (filters.environment && interaction.environment !== filters.environment) {
          continue
        }

        if (filters.source && interaction.source !== filters.source) {
          continue
        }

        if (filters.fromDate && interaction.createdAt < filters.fromDate) {
          continue
        }

        if (filters.toDate && interaction.createdAt > filters.toDate) {
          continue
        }

        interactions.push(interaction)
      } catch (error) {
        continue
      }
    }

    return interactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  getByCorrelationId(correlationId) {
    if (!correlationId) {
      return []
    }

    const allInteractions = []
    const dirs = this.#findInteractionDirs()

    for (const dir of dirs) {
      if (!this.#fs.existsSync(dir)) {
        continue
      }

      const files = this.#fs.readdirSync(dir)
      for (const file of files) {
        if (!file.endsWith('.json') || file === 'index.json') {
          continue
        }

        const interactionPath = join(dir, file)
        try {
          const interaction = this.#readJson(interactionPath)
          if (interaction && interaction.correlationId === correlationId) {
            allInteractions.push(interaction)
          }
        } catch (error) {
          continue
        }
      }
    }

    return allInteractions.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  updateStatus(interactionId, newStatus, previousStatus) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new InteractionNotFoundError(interactionId)
    }

    if (existing.status !== previousStatus) {
      throw new InteractionConcurrencyError(interactionId, `Status changed from ${previousStatus} to ${existing.status}`)
    }

    const validTransitions = VALID_STATUS_TRANSITIONS[existing.status]
    if (!validTransitions || !validTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${existing.status} to ${newStatus}`)
    }

    return this.update(interactionId, { status: newStatus })
  }

  getHistory(interactionId) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new InteractionNotFoundError(interactionId)
    }

    const historyPath = this.#getHistoryPath(existing.applicationId, interactionId)
    if (!this.#fs.existsSync(historyPath)) {
      return { entries: [], interactionId, createdAt: existing.createdAt }
    }

    return this.#readJson(historyPath)
  }

  addHistoryEntry(interactionId, entry) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new InteractionNotFoundError(interactionId)
    }

    const historyPath = this.#getHistoryPath(existing.applicationId, interactionId)
    const history = this.getHistory(interactionId)

    history.entries.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    })

    this.#writeJson(historyPath, history)

    return history
  }

  exists(interactionId) {
    if (this.#cache.has(interactionId)) {
      return true
    }

    const idValidation = validateInteractionId(interactionId)
    if (!idValidation.valid) {
      return false
    }

    const dirs = this.#findInteractionDirs()
    for (const dir of dirs) {
      const interactionPath = join(dir, `${interactionId}.json`)
      if (this.#fs.existsSync(interactionPath)) {
        return true
      }
    }

    return false
  }

  #getBaseDir() {
    return this.#basePath
  }

  #getInteractionDir(applicationId) {
    const { domain, routeKey } = this.#parseApplicationId(applicationId)
    return join(this.#getBaseDir(), domain, routeKey, 'interactions')
  }

  #getInteractionPath(applicationId, interactionId) {
    return join(this.#getInteractionDir(applicationId), `${interactionId}.json`)
  }

  #getHistoryPath(applicationId, interactionId) {
    return join(this.#getInteractionDir(applicationId), 'history', `${interactionId}.json`)
  }

  #parseApplicationId(applicationId) {
    const firstSlash = applicationId.indexOf('/')

    if (firstSlash === -1) {
      throw new Error('Application ID must be in format: domain/route')
    }

    const domain = applicationId.substring(0, firstSlash)
    const route = applicationId.substring(firstSlash)

    if (!CANONICAL_DOMAINS.includes(domain)) {
      throw new Error(`Invalid domain: ${domain}`)
    }

    const routeKey = this.#routeToKey(route)

    return { domain, route, routeKey }
  }

  #routeToKey(route) {
    return route.replace(/^\//, '').replace(/\//g, '_')
  }

  #findInteractionDirs() {
    const baseDir = this.#getBaseDir()
    const dirs = []

    if (!this.#fs.existsSync(baseDir)) {
      return dirs
    }

    const domains = this.#fs.readdirSync(baseDir)
    for (const domain of domains) {
      if (!CANONICAL_DOMAINS.includes(domain)) {
        continue
      }

      const domainDir = join(baseDir, domain)
      if (!this.#fs.statSync(domainDir).isDirectory()) {
        continue
      }

      const routeDirs = this.#fs.readdirSync(domainDir)
      for (const routeKey of routeDirs) {
        const interactionDir = join(domainDir, routeKey, 'interactions')
        if (this.#fs.existsSync(interactionDir)) {
          dirs.push(interactionDir)
        }
      }
    }

    return dirs
  }

  #ensureDir(dir) {
    if (!this.#fs.existsSync(dir)) {
      this.#fs.mkdirSync(dir, { recursive: true })
    }
  }

  #readJson(filePath) {
    try {
      const content = this.#fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw new InteractionSerializationError(`Failed to read ${filePath}: ${error.message}`)
    }
  }

  #writeJson(filePath, data) {
    try {
      const content = JSON.stringify(data, null, 2)
      const tempPath = filePath + '.tmp'

      this.#ensureDir(dirname(filePath))

      this.#fs.writeFileSync(tempPath, content, 'utf8')
      this.#fs.renameSync(tempPath, filePath)
    } catch (error) {
      throw new InteractionStorageError(`Failed to write ${filePath}: ${error.message}`)
    }
  }
}

export function createFileInteractionPersistence(options = {}) {
  return new FileBusinessInteractionPersistence(options)
}

export default {
  FileBusinessInteractionPersistence,
  createFileInteractionPersistence
}
