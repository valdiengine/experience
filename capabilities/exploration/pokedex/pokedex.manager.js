/**
 * Pokedex Manager — Species collection management
 */
import { SPECIES_RARITY, KNOWLEDGE_LEVEL, VALIDATION_STATUS } from '../exploration.schema.js'
import { EXPLORATION_EVENTS } from '../exploration.events.js'

export class PokedexManager {
  #context = null
  #collections = new Map()

  constructor(context) {
    this.#context = context
  }

  addEntry(visitorId, destinationId, speciesId, data = {}) {
    const key = visitorId + ':' + destinationId
    if (!this.#collections.has(key)) {
      this.#collections.set(key, [])
    }
    const collection = this.#collections.get(key)
    const existing = collection.find(e => e.speciesId === speciesId)
    if (existing) {
      if (data.image) existing.image = data.image
      if (data.validationStatus) existing.validationStatus = data.validationStatus
      this.#emitEvent(EXPLORATION_EVENTS.POKEDEX_ENTRY_UPDATED, { visitorId, speciesId, destinationId })
      return { success: true, entry: existing, isNew: false }
    }
    const entry = {
      speciesId,
      visitorId,
      destinationId,
      discoveredAt: new Date().toISOString(),
      location: data.location || null,
      observationId: data.observationId || null,
      image: data.image || null,
      validationStatus: data.validationStatus || VALIDATION_STATUS.PENDING,
      rarity: data.rarity || SPECIES_RARITY.COMMON,
      firstDiscovery: this.#isFirstSpeciesDiscovery(visitorId, speciesId),
      knowledgeUnlocked: KNOWLEDGE_LEVEL.BASIC,
    }
    collection.push(entry)
    this.#emitEvent(EXPLORATION_EVENTS.POKEDEX_ENTRY_ADDED, { visitorId, speciesId, destinationId, entry })
    return { success: true, entry, isNew: true }
  }

  getCollection(visitorId, destinationId) {
    const key = visitorId + ':' + destinationId
    return this.#collections.get(key) || []
  }

  getSpeciesCount(visitorId, destinationId) {
    return this.getCollection(visitorId, destinationId).length
  }

  getByRarity(visitorId, destinationId, rarity) {
    return this.getCollection(visitorId, destinationId).filter(e => e.rarity === rarity)
  }

  getValidatedCount(visitorId, destinationId) {
    return this.getCollection(visitorId, destinationId)
      .filter(e => e.validationStatus !== VALIDATION_STATUS.PENDING).length
  }

  unlockKnowledge(visitorId, destinationId, speciesId) {
    const collection = this.getCollection(visitorId, destinationId)
    const entry = collection.find(e => e.speciesId === speciesId)
    if (!entry) return { success: false, error: 'Entry not found' }
    if (entry.knowledgeUnlocked < KNOWLEDGE_LEVEL.SCIENTIFIC) {
      entry.knowledgeUnlocked++
      this.#emitEvent(EXPLORATION_EVENTS.POKEDEX_KNOWLEDGE_UNLOCKED, {
        visitorId, speciesId, destinationId, level: entry.knowledgeUnlocked,
      })
    }
    return { success: true, entry }
  }

  updateValidation(visitorId, destinationId, speciesId, status) {
    const collection = this.getCollection(visitorId, destinationId)
    const entry = collection.find(e => e.speciesId === speciesId)
    if (!entry) return { success: false, error: 'Entry not found' }
    entry.validationStatus = status
    if (status === VALIDATION_STATUS.EXPERT_VALIDATED) {
      entry.knowledgeUnlocked = Math.max(entry.knowledgeUnlocked, KNOWLEDGE_LEVEL.CONSERVATION)
    }
    return { success: true, entry }
  }

  getStats(visitorId, destinationId) {
    const collection = this.getCollection(visitorId, destinationId)
    return {
      total: collection.length,
      validated: collection.filter(e => e.validationStatus !== VALIDATION_STATUS.PENDING).length,
      byRarity: {
        common: collection.filter(e => e.rarity === SPECIES_RARITY.COMMON).length,
        uncommon: collection.filter(e => e.rarity === SPECIES_RARITY.UNCOMMON).length,
        rare: collection.filter(e => e.rarity === SPECIES_RARITY.RARE).length,
        epic: collection.filter(e => e.rarity === SPECIES_RARITY.EPIC).length,
        legendary: collection.filter(e => e.rarity === SPECIES_RARITY.LEGENDARY).length,
      },
      firstDiscoveries: collection.filter(e => e.firstDiscovery).length,
    }
  }

  #isFirstSpeciesDiscovery(visitorId, speciesId) {
    for (const [key, collection] of this.#collections) {
      if (key.startsWith(visitorId + ':') && collection.some(e => e.speciesId === speciesId)) {
        return false
      }
    }
    return true
  }

  #emitEvent(event, data) {
    const eventBus = this.#context?.eventBus
    if (eventBus) eventBus.emit(event, data)
  }
}
