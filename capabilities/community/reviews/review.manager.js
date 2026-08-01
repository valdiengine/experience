/**
 * Review Manager — Handles reviews for destinations, localities, places, experiences, businesses
 *
 * Business-agnostic: reviews belong to any ecosystem entity.
 * No direct capability imports — uses context.capabilities.get()
 */
import { REVIEW_SCHEMA, MODERATION_STATUS } from '../community.schema.js'
import { COMMUNITY_EVENTS } from '../community.events.js'

export class ReviewManager {
  #context = null
  #reviews = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Create a new review
   * @param {object} data - Review data
   * @returns {object} Created review
   */
  create(data) {
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const review = {
      id,
      visitorId: data.visitorId,
      entityType: data.entityType,
      entityId: data.entityId,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      images: data.images || [],
      verifiedVisit: data.verifiedVisit || false,
      helpfulVotes: 0,
      moderationStatus: MODERATION_STATUS.PENDING,
      createdAt: new Date().toISOString(),
    }

    const validation = REVIEW_SCHEMA.validate(review)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#reviews.set(id, review)

    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.REVIEW_CREATED, { review })

    return { success: true, review }
  }

  /**
   * Get review by ID
   * @param {string} id - Review ID
   * @returns {object|null}
   */
  getById(id) {
    return this.#reviews.get(id) || null
  }

  /**
   * Get reviews by entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {object[]}
   */
  getByEntity(entityType, entityId) {
    return Array.from(this.#reviews.values())
      .filter(r => r.entityType === entityType && r.entityId === entityId)
      .filter(r => r.moderationStatus === MODERATION_STATUS.APPROVED)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Get reviews by visitor
   * @param {string} visitorId - Visitor ID
   * @returns {object[]}
   */
  getByVisitor(visitorId) {
    return Array.from(this.#reviews.values())
      .filter(r => r.visitorId === visitorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  /**
   * Update review
   * @param {string} id - Review ID
   * @param {object} updates - Fields to update
   * @returns {object}
   */
  update(id, updates) {
    const review = this.#reviews.get(id)
    if (!review) return { success: false, error: 'Review not found' }

    const allowed = ['rating', 'title', 'comment', 'images']
    for (const key of allowed) {
      if (updates[key] !== undefined) review[key] = updates[key]
    }

    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.REVIEW_UPDATED, { review })
    return { success: true, review }
  }

  /**
   * Vote helpful on a review
   * @param {string} id - Review ID
   */
  voteHelpful(id) {
    const review = this.#reviews.get(id)
    if (!review) return
    review.helpfulVotes = (review.helpfulVotes || 0) + 1
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.INTERACTION_CREATED, {
      interactionType: 'helpful',
      targetId: id,
    })
  }

  /**
   * Get average rating for entity
   * @param {string} entityType
   * @param {string} entityId
   * @returns {object} { average, count }
   */
  getAverageRating(entityType, entityId) {
    const reviews = this.getByEntity(entityType, entityId)
    if (reviews.length === 0) return { average: 0, count: 0 }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
    return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length }
  }

  /**
   * Delete review
   * @param {string} id - Review ID
   * @returns {object}
   */
  delete(id) {
    if (!this.#reviews.has(id)) return { success: false, error: 'Review not found' }
    this.#reviews.delete(id)
    return { success: true }
  }

  /**
   * Get all reviews (admin)
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#reviews.values())
  }
}
