/**
 * Community Capability — Destination Community & Memory Layer
 *
 * Business-agnostic: orchestrates visitor memories, reviews, interactions,
 * reputation, moderation, and community analytics.
 * No direct capability imports — uses context.capabilities.get()
 */
import { BaseCapability } from '../core/base.capability.js'
import { CommunityManager } from './community.manager.js'
import { COMMUNITY_EVENTS } from './community.events.js'

export class CommunityCapability extends BaseCapability {
  static id = 'community'
  static name = 'Community'
  static version = '1.0.0'
  static dependencies = []

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new CommunityManager(context)
  }

  async activate() {
    this.#manager.init()
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#manager = null
    await super.destroy()
  }

  get manager() { return this.#manager }
  get memories() { return this.#manager?.memories }
  get reviews() { return this.#manager?.reviews }
  get interactions() { return this.#manager?.interactions }
  get profiles() { return this.#manager?.profiles }
  get reputation() { return this.#manager?.reputation }
  get moderation() { return this.#manager?.moderation }
  get analytics() { return this.#manager?.analytics }

  // ── Visitor ──

  registerVisitor(data) {
    return this.#manager?.registerVisitor(data) || { success: false }
  }

  getVisitorProfile(userId) {
    return this.#manager?.getVisitorProfile(userId) || null
  }

  // ── Memories ──

  createMemory(data) {
    return this.#manager?.createMemory(data) || { success: false }
  }

  getMemoriesByEntity(entityType, entityId) {
    return this.#manager?.getMemoriesByEntity(entityType, entityId) || []
  }

  likeMemory(memoryId, userId) {
    return this.#manager?.likeMemory(memoryId, userId) || { success: false }
  }

  // ── Reviews ──

  createReview(data) {
    return this.#manager?.createReview(data) || { success: false }
  }

  getReviewsByEntity(entityType, entityId) {
    return this.#manager?.getReviewsByEntity(entityType, entityId) || []
  }

  getAverageRating(entityType, entityId) {
    return this.#manager?.getAverageRating(entityType, entityId) || { average: 0, count: 0 }
  }

  // ── Interactions ──

  like(userId, targetType, targetId) {
    return this.#manager?.like(userId, targetType, targetId) || { success: false }
  }

  follow(userId, targetType, targetId) {
    return this.#manager?.follow(userId, targetType, targetId) || { success: false }
  }

  markHelpful(userId, reviewId) {
    return this.#manager?.markHelpful(userId, reviewId) || { success: false }
  }

  // ── Visit Tracking ──

  trackVisit(userId, entityType, entityId, interactionType) {
    this.#manager?.trackVisit(userId, entityType, entityId, interactionType)
  }

  // ── Moderation ──

  approveContent(contentId, reviewedBy) {
    return this.#manager?.approveContent(contentId, reviewedBy) || { success: false }
  }

  rejectContent(contentId, reason, reviewedBy) {
    return this.#manager?.rejectContent(contentId, reason, reviewedBy) || { success: false }
  }

  flagContent(contentId, reason) {
    return this.#manager?.flagContent(contentId, reason) || { success: false }
  }

  getModerationQueue() {
    return this.#manager?.getModerationQueue() || []
  }

  getModerationStats() {
    return this.#manager?.getModerationStats() || {}
  }

  // ── Analytics ──

  getCommunityMetrics() {
    return this.#manager?.getCommunityMetrics() || {}
  }

  getMostEngagedEntities(limit) {
    return this.#manager?.getMostEngagedEntities(limit) || []
  }

  // ── Reputation ──

  getVisitorReputation(visitorId) {
    return this.#manager?.getVisitorReputation(visitorId) || null
  }

  getTopVisitors(limit) {
    return this.#manager?.getTopVisitors(limit) || []
  }
}

export default CommunityCapability
