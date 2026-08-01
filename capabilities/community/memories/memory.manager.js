/**
 * Memory Manager — Handles visitor memories in the ecosystem
 *
 * Business-agnostic: memories belong to territories (destinations, localities,
 * places, experiences, businesses).
 * No direct capability imports — uses context.capabilities.get()
 */
import { MEMORY_SCHEMA, MODERATION_STATUS, MEMORY_TYPE, VISIBILITY } from '../community.schema.js'
import { COMMUNITY_EVENTS } from '../community.events.js'

export class MemoryManager {
  #context = null
  #memories = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Create a new memory
   * @param {object} data - Memory data
   * @returns {object} Created memory
   */
  create(data) {
    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const memory = {
      id,
      visitorId: data.visitorId,
      entityType: data.entityType,
      entityId: data.entityId,
      memoryType: data.memoryType || MEMORY_TYPE.TRAVEL_STORY,
      title: data.title,
      description: data.description,
      images: data.images || [],
      location: data.location || null,
      visitDate: data.visitDate || null,
      likes: 0,
      comments: 0,
      visibility: data.visibility || VISIBILITY.PUBLIC,
      moderationStatus: MODERATION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
    }

    const validation = MEMORY_SCHEMA.validate(memory)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#memories.set(id, memory)

    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.MEMORY_CREATED, { memory })

    return { success: true, memory }
  }

  /**
   * Get memory by ID
   * @param {string} id - Memory ID
   * @returns {object|null}
   */
  getById(id) {
    return this.#memories.get(id) || null
  }

  /**
   * Get memories by entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {object[]}
   */
  getByEntity(entityType, entityId) {
    return Array.from(this.#memories.values())
      .filter(m => m.entityType === entityType && m.entityId === entityId)
      .filter(m => m.moderationStatus === MODERATION_STATUS.APPROVED)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get memories by visitor
   * @param {string} visitorId - Visitor ID
   * @returns {object[]}
   */
  getByVisitor(visitorId) {
    return Array.from(this.#memories.values())
      .filter(m => m.visitorId === visitorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Update memory
   * @param {string} id - Memory ID
   * @param {object} updates - Fields to update
   * @returns {object}
   */
  update(id, updates) {
    const memory = this.#memories.get(id)
    if (!memory) return { success: false, error: 'Memory not found' }

    const allowed = ['title', 'description', 'images', 'visitDate', 'visibility']
    for (const key of allowed) {
      if (updates[key] !== undefined) memory[key] = updates[key]
    }

    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.MEMORY_UPDATED, { memory })
    return { success: true, memory }
  }

  /**
   * Like a memory
   * @param {string} id - Memory ID
   */
  like(id) {
    const memory = this.#memories.get(id)
    if (!memory) return
    memory.likes = (memory.likes || 0) + 1
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.MEMORY_LIKED, { memoryId: id, likes: memory.likes })
  }

  /**
   * Delete memory
   * @param {string} id - Memory ID
   * @returns {object}
   */
  delete(id) {
    if (!this.#memories.has(id)) return { success: false, error: 'Memory not found' }
    this.#memories.delete(id)
    return { success: true }
  }

  /**
   * Get recent memories across ecosystem
   * @param {number} limit - Max results
   * @returns {object[]}
   */
  getRecent(limit = 20) {
    return Array.from(this.#memories.values())
      .filter(m => m.moderationStatus === MODERATION_STATUS.APPROVED)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
  }

  /**
   * Get memory count by entity
   * @param {string} entityType
   * @param {string} entityId
   * @returns {number}
   */
  countByEntity(entityType, entityId) {
    return this.getByEntity(entityType, entityId).length
  }

  /**
   * Get all memories (admin)
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#memories.values())
  }
}
