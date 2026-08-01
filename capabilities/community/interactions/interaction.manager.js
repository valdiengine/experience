/**
 * Interaction Manager — Handles likes, comments, follows, helpful votes
 *
 * Business-agnostic: interactions apply to any ecosystem entity.
 * No direct capability imports — uses context.capabilities.get()
 */
import { INTERACTION_SCHEMA, INTERACTION_TYPE } from '../community.schema.js'
import { COMMUNITY_EVENTS } from '../community.events.js'

export class InteractionManager {
  #context = null
  #interactions = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Create an interaction
   * @param {object} data - Interaction data
   * @returns {object}
   */
  create(data) {
    const id = `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const interaction = {
      id,
      userId: data.userId,
      targetType: data.targetType,
      targetId: data.targetId,
      interactionType: data.interactionType,
      createdAt: new Date().toISOString(),
    }

    const validation = INTERACTION_SCHEMA.validate(interaction)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#interactions.set(id, interaction)
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.INTERACTION_CREATED, { interaction })

    return { success: true, interaction }
  }

  /**
   * Like an entity
   * @param {string} userId
   * @param {string} targetType
   * @param {string} targetId
   * @returns {object}
   */
  like(userId, targetType, targetId) {
    const existing = this.#findUserInteraction(userId, targetType, targetId, INTERACTION_TYPE.LIKE)
    if (existing) return { success: false, error: 'Already liked' }
    return this.create({ userId, targetType, targetId, interactionType: INTERACTION_TYPE.LIKE })
  }

  /**
   * Remove like
   * @param {string} userId
   * @param {string} targetType
   * @param {string} targetId
   * @returns {object}
   */
  unlike(userId, targetType, targetId) {
    const existing = this.#findUserInteraction(userId, targetType, targetId, INTERACTION_TYPE.LIKE)
    if (!existing) return { success: false, error: 'Not liked' }
    this.#interactions.delete(existing.id)
    return { success: true }
  }

  /**
   * Follow an entity
   * @param {string} userId
   * @param {string} targetType
   * @param {string} targetId
   * @returns {object}
   */
  follow(userId, targetType, targetId) {
    const existing = this.#findUserInteraction(userId, targetType, targetId, INTERACTION_TYPE.FOLLOW)
    if (existing) return { success: false, error: 'Already following' }
    return this.create({ userId, targetType, targetId, interactionType: INTERACTION_TYPE.FOLLOW })
  }

  /**
   * Unfollow an entity
   * @param {string} userId
   * @param {string} targetType
   * @param {string} targetId
   * @returns {object}
   */
  unfollow(userId, targetType, targetId) {
    const existing = this.#findUserInteraction(userId, targetType, targetId, INTERACTION_TYPE.FOLLOW)
    if (!existing) return { success: false, error: 'Not following' }
    this.#interactions.delete(existing.id)
    return { success: true }
  }

  /**
   * Vote helpful on a review
   * @param {string} userId
   * @param {string} reviewId
   * @returns {object}
   */
  markHelpful(userId, reviewId) {
    const existing = this.#findUserInteraction(userId, 'review', reviewId, INTERACTION_TYPE.HELPFUL)
    if (existing) return { success: false, error: 'Already voted' }
    return this.create({ userId, targetType: 'review', targetId: reviewId, interactionType: INTERACTION_TYPE.HELPFUL })
  }

  /**
   * Get interactions by target
   * @param {string} targetType
   * @param {string} targetId
   * @param {string} [type] - Optional interaction type filter
   * @returns {object[]}
   */
  getByTarget(targetType, targetId, type = null) {
    return Array.from(this.#interactions.values())
      .filter(i => i.targetType === targetType && i.targetId === targetId)
      .filter(i => !type || i.interactionType === type)
  }

  /**
   * Get interactions by user
   * @param {string} userId
   * @param {string} [type] - Optional interaction type filter
   * @returns {object[]}
   */
  getByUser(userId, type = null) {
    return Array.from(this.#interactions.values())
      .filter(i => i.userId === userId)
      .filter(i => !type || i.interactionType === type)
  }

  /**
   * Count interactions by target and type
   * @param {string} targetType
   * @param {string} targetId
   * @param {string} type
   * @returns {number}
   */
  countByTarget(targetType, targetId, type) {
    return this.getByTarget(targetType, targetId, type).length
  }

  /**
   * Check if user has interacted
   * @param {string} userId
   * @param {string} targetType
   * @param {string} targetId
   * @param {string} type
   * @returns {boolean}
   */
  hasInteracted(userId, targetType, targetId, type) {
    return !!this.#findUserInteraction(userId, targetType, targetId, type)
  }

  #findUserInteraction(userId, targetType, targetId, type) {
    return Array.from(this.#interactions.values()).find(
      i => i.userId === userId && i.targetType === targetType && i.targetId === targetId && i.interactionType === type
    ) || null
  }
}
