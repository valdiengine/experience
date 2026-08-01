/**
 * Community Analytics - Tracks community engagement metrics
 *
 * Business-agnostic: records counts, entity engagement, visitor activity.
 * Integrates with observability capability for metrics export.
 * No direct capability imports - uses context.capabilities.get().
 */
export class CommunityAnalytics {
  #context = null
  #metrics = {
    activeVisitors: 0,
    memoriesCreated: 0,
    reviewsCreated: 0,
    interactions: 0,
    entityEngagement: new Map(),
  }

  constructor(context) {
    this.#context = context
  }

  recordActiveVisitor() {
    this.#metrics.activeVisitors++
    this.#emitMetric('active_visitors', this.#metrics.activeVisitors)
  }

  recordMemoryCreated() {
    this.#metrics.memoriesCreated++
    this.#emitMetric('memories_created', this.#metrics.memoriesCreated)
  }

  recordReviewCreated() {
    this.#metrics.reviewsCreated++
    this.#emitMetric('reviews_created', this.#metrics.reviewsCreated)
  }

  recordInteraction(type) {
    this.#metrics.interactions++
    this.#emitMetric('interactions', this.#metrics.interactions)
  }

  recordEntityEngagement(entityType, entityId, engagementType) {
    const key = entityType + ':' + entityId
    if (!this.#metrics.entityEngagement.has(key)) {
      this.#metrics.entityEngagement.set(key, {
        entityType,
        entityId,
        views: 0,
        memories: 0,
        reviews: 0,
        likes: 0,
      })
    }

    const entry = this.#metrics.entityEngagement.get(key)

    switch (engagementType) {
      case 'view':
        entry.views++
        break
      case 'memory':
        entry.memories++
        break
      case 'review':
        entry.reviews++
        break
      case 'like':
        entry.likes++
        break
    }
  }

  getSummary() {
    return {
      activeVisitors: this.#metrics.activeVisitors,
      memoriesCreated: this.#metrics.memoriesCreated,
      reviewsCreated: this.#metrics.reviewsCreated,
      interactions: this.#metrics.interactions,
      totalEntities: this.#metrics.entityEngagement.size,
    }
  }

  getMostEngaged(limit = 10) {
    const entries = Array.from(this.#metrics.entityEngagement.values())
    entries.sort((a, b) => {
      const scoreA = a.views + a.memories * 3 + a.reviews * 3 + a.likes
      const scoreB = b.views + b.memories * 3 + b.reviews * 3 + b.likes
      return scoreB - scoreA
    })
    return entries.slice(0, limit)
  }

  #emitMetric(name, value) {
    const eventBus = this.#context?.eventBus
    if (eventBus) {
      eventBus.emit('community:metric_recorded', { metric: name, value })
    }

    this.#sendToObservability(name, value)
  }

  #sendToObservability(metric, value) {
    try {
      const observability = this.#context?.capabilities?.get('observability')
      if (observability && typeof observability.recordMetric === 'function') {
        observability.recordMetric('community.' + metric, value)
      }
    } catch (_) {
      // Observability not available - graceful degradation
    }
  }
}