/**
 * Community Manager — Orchestrates all community sub-modules
 *
 * Business-agnostic: coordinates memories, reviews, interactions, profiles,
 * moderation, and analytics.
 * No direct capability imports — uses context.capabilities.get()
 */
import { MemoryManager } from './memories/memory.manager.js'
import { ReviewManager } from './reviews/review.manager.js'
import { InteractionManager } from './interactions/interaction.manager.js'
import { VisitorProfile } from './profiles/visitor.profile.js'
import { ReputationManager } from './profiles/reputation.manager.js'
import { ModerationManager } from './moderation/moderation.manager.js'
import { CommunityAnalytics } from './analytics/community.analytics.js'
import { ENTITY_TYPE, MODERATION_STATUS, INTERACTION_TYPE } from './community.schema.js'
import { COMMUNITY_EVENTS } from './community.events.js'

export class CommunityManager {
  #context = null
  #memoryManager = null
  #reviewManager = null
  #interactionManager = null
  #visitorProfile = null
  #reputationManager = null
  #moderationManager = null
  #analytics = null

  constructor(context) {
    this.#context = context
    this.#memoryManager = new MemoryManager(context)
    this.#reviewManager = new ReviewManager(context)
    this.#interactionManager = new InteractionManager(context)
    this.#visitorProfile = new VisitorProfile(context)
    this.#reputationManager = new ReputationManager(context)
    this.#moderationManager = new ModerationManager(context)
    this.#analytics = new CommunityAnalytics(context)
  }

  get memories() { return this.#memoryManager }
  get reviews() { return this.#reviewManager }
  get interactions() { return this.#interactionManager }
  get profiles() { return this.#visitorProfile }
  get reputation() { return this.#reputationManager }
  get moderation() { return this.#moderationManager }
  get analytics() { return this.#analytics }

  init() {
    this.#subscribeToEvents()
  }

  // ── Visitor ──

  registerVisitor(data) {
    const result = this.#visitorProfile.register(data)
    if (result.isNew) {
      this.#analytics.recordActiveVisitor()
    }
    return result
  }

  getVisitorProfile(userId) {
    return this.#visitorProfile.getByUserId(userId)
  }

  // ── Memories ──

  createMemory(data) {
    const result = this.#memoryManager.create(data)
    if (result.success) {
      this.#moderationManager.enqueue('memory', result.memory.id, result.memory)
      this.#analytics.recordMemoryCreated()

      const visitor = this.#visitorProfile.getByUserId(data.visitorId)
      if (visitor) {
        this.#visitorProfile.incrementMemories(visitor.id)
        this.#reputationManager.addPoints(visitor.id, 'MEMORY_CREATED')
      }

      this.#analytics.recordEntityEngagement(data.entityType, data.entityId, 'memory')
    }
    return result
  }

  getMemoriesByEntity(entityType, entityId) {
    return this.#memoryManager.getByEntity(entityType, entityId)
  }

  likeMemory(memoryId, userId) {
    this.#memoryManager.like(memoryId)
    this.#analytics.recordInteraction('like')
    this.#analytics.recordEntityEngagement('memory', memoryId, 'like')
    return { success: true }
  }

  // ── Reviews ──

  createReview(data) {
    const result = this.#reviewManager.create(data)
    if (result.success) {
      this.#moderationManager.enqueue('review', result.review.id, result.review)
      this.#analytics.recordReviewCreated()

      const visitor = this.#visitorProfile.getByUserId(data.visitorId)
      if (visitor) {
        this.#visitorProfile.incrementReviews(visitor.id)
        this.#reputationManager.addPoints(visitor.id, 'REVIEW_CREATED')
      }

      this.#analytics.recordEntityEngagement(data.entityType, data.entityId, 'review')
    }
    return result
  }

  getReviewsByEntity(entityType, entityId) {
    return this.#reviewManager.getByEntity(entityType, entityId)
  }

  getAverageRating(entityType, entityId) {
    return this.#reviewManager.getAverageRating(entityType, entityId)
  }

  // ── Interactions ──

  like(userId, targetType, targetId) {
    const result = this.#interactionManager.like(userId, targetType, targetId)
    if (result.success) {
      this.#analytics.recordInteraction('like')
      this.#analytics.recordEntityEngagement(targetType, targetId, 'like')
    }
    return result
  }

  follow(userId, targetType, targetId) {
    return this.#interactionManager.follow(userId, targetType, targetId)
  }

  markHelpful(userId, reviewId) {
    const result = this.#interactionManager.markHelpful(userId, reviewId)
    if (result.success) {
      this.#analytics.recordInteraction('helpful')
      const review = this.#reviewManager.getById(reviewId)
      if (review) {
        const visitor = this.#visitorProfile.getByUserId(review.visitorId)
        if (visitor) {
          this.#reputationManager.addPoints(visitor.id, 'HELPFUL_VOTE_RECEIVED')
        }
      }
    }
    return result
  }

  // ── Visit Tracking ──

  trackVisit(userId, entityType, entityId, interactionType = 'viewed') {
    const visitor = this.#visitorProfile.getByUserId(userId)
    if (!visitor) return

    if (entityType === ENTITY_TYPE.DESTINATION) {
      this.#visitorProfile.recordDestinationVisit(visitor.id, entityId)
      this.#context?.eventBus?.emit(COMMUNITY_EVENTS.VISIT_DESTINATION, { visitorId: userId, destinationId: entityId })
    } else if (entityType === ENTITY_TYPE.LOCALITY) {
      this.#visitorProfile.recordLocalityVisit(visitor.id, entityId)
      this.#context?.eventBus?.emit(COMMUNITY_EVENTS.VISIT_LOCALITY, { visitorId: userId, localityId: entityId })
    } else if (entityType === ENTITY_TYPE.PLACE) {
      this.#visitorProfile.recordPlaceDiscovery(visitor.id, entityId)
      this.#context?.eventBus?.emit(COMMUNITY_EVENTS.VISIT_PLACE, { visitorId: userId, placeId: entityId })
      this.#reputationManager.addPoints(visitor.id, 'VISIT_VERIFIED')
    }

    this.#analytics.recordEntityEngagement(entityType, entityId, 'view')
  }

  // ── Moderation ──

  approveContent(contentId, reviewedBy) {
    const result = this.#moderationManager.approve(contentId, reviewedBy)
    if (result.success && result.status === MODERATION_STATUS.APPROVED) {
      const entry = this.#moderationManager.getPending().find(() => false)
      const queue = this.#moderationManager.getPending()
      const flagged = this.#moderationManager.getFlagged()
    }
    return result
  }

  rejectContent(contentId, reason, reviewedBy) {
    return this.#moderationManager.reject(contentId, reason, reviewedBy)
  }

  flagContent(contentId, reason) {
    return this.#moderationManager.flag(contentId, reason)
  }

  getModerationQueue() {
    return this.#moderationManager.getPending()
  }

  getModerationStats() {
    return this.#moderationManager.getStats()
  }

  // ── Analytics ──

  getCommunityMetrics() {
    return this.#analytics.getSummary()
  }

  getMostEngagedEntities(limit) {
    return this.#analytics.getMostEngaged(limit)
  }

  // ── Reputation ──

  getVisitorReputation(visitorId) {
    return this.#reputationManager.get(visitorId)
  }

  getTopVisitors(limit) {
    return this.#reputationManager.getTopVisitors(limit)
  }

  // ── Events ──

  #subscribeToEvents() {
    const eventBus = this.#context?.eventBus
    if (!eventBus) return

    eventBus.on('destination:created', (data) => {
      if (data.destinationId) {
        this.#analytics.recordEntityEngagement(ENTITY_TYPE.DESTINATION, data.destinationId, 'view')
      }
    })

    eventBus.on('locality:created', (data) => {
      if (data.localityId) {
        this.#analytics.recordEntityEngagement(ENTITY_TYPE.LOCALITY, data.localityId, 'view')
      }
    })
  }
}
