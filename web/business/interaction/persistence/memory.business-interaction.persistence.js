/**
 * In-memory persistence for BusinessInteraction testing.
 */

import { BusinessInteraction } from '../business-interaction.model.js'
import { BusinessInteractionPersistence } from './business-interaction.persistence.js'

export class InMemoryBusinessInteractionPersistence extends BusinessInteractionPersistence {
  #interactions
  #history

  constructor() {
    super()
    this.#interactions = new Map()
    this.#history = new Map()
  }

  create(interactionData) {
    const interaction = new BusinessInteraction(interactionData)

    if (this.exists(interaction.id)) {
      throw new Error(`Duplicate interaction: ${interaction.id}`)
    }

    this.#interactions.set(interaction.id, interaction.toJSON())
    this.#history.set(interaction.id, {
      entries: [],
      interactionId: interaction.id,
      createdAt: new Date().toISOString()
    })

    return interaction.toJSON()
  }

  get(interactionId) {
    return this.#interactions.get(interactionId) || null
  }

  update(interactionId, updates) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new Error(`Interaction not found: ${interactionId}`)
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: (existing.version || 0) + 1
    }

    this.#interactions.set(interactionId, updated)
    return { ...updated }
  }

  delete(interactionId) {
    this.#interactions.delete(interactionId)
    this.#history.delete(interactionId)
    return true
  }

  list(applicationId, filters = {}) {
    const all = Array.from(this.#interactions.values())
      .filter(i => i.applicationId === applicationId)

    return all.filter(interaction => {
      if (filters.type && interaction.type !== filters.type) return false
      if (filters.status && interaction.status !== filters.status) return false
      if (filters.environment && interaction.environment !== filters.environment) return false
      if (filters.source && interaction.source !== filters.source) return false
      return true
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  getByCorrelationId(correlationId) {
    return Array.from(this.#interactions.values())
      .filter(i => i.correlationId === correlationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  updateStatus(interactionId, newStatus, previousStatus) {
    const existing = this.get(interactionId)
    if (!existing) {
      throw new Error(`Interaction not found: ${interactionId}`)
    }

    if (existing.status !== previousStatus) {
      throw new Error(`Status changed from ${previousStatus} to ${existing.status}`)
    }

    return this.update(interactionId, { status: newStatus })
  }

  getHistory(interactionId) {
    return this.#history.get(interactionId) || { entries: [], interactionId, createdAt: new Date().toISOString() }
  }

  addHistoryEntry(interactionId, entry) {
    const history = this.getHistory(interactionId)
    history.entries.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString()
    })
    this.#history.set(interactionId, history)
    return history
  }

  exists(interactionId) {
    return this.#interactions.has(interactionId)
  }

  clear() {
    this.#interactions.clear()
    this.#history.clear()
  }
}

export function createInMemoryInteractionPersistence() {
  return new InMemoryBusinessInteractionPersistence()
}
