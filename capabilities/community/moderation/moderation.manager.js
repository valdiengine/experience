/**
 * Moderation Manager — Content moderation workflow
 *
 * Business-agnostic: moderation applies to memories and reviews.
 * No direct capability imports — uses context.capabilities.get()
 */
import { MODERATION_STATUS } from '../community.schema.js'
import { COMMUNITY_EVENTS } from '../community.events.js'

export class ModerationManager {
  #context = null
  #queue = new Map()

  constructor(context) {
    this.#context = context
  }

  enqueue(contentType, contentId, content) {
    this.#queue.set(contentId, {
      contentType,
      contentId,
      content,
      status: MODERATION_STATUS.PENDING,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      reason: null,
    })
  }

  approve(contentId, reviewedBy = 'system') {
    const entry = this.#queue.get(contentId)
    if (!entry) return { success: false, error: 'Not in queue' }
    entry.status = MODERATION_STATUS.APPROVED
    entry.reviewedAt = new Date().toISOString()
    entry.reviewedBy = reviewedBy
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.CONTENT_APPROVED, {
      contentType: entry.contentType,
      contentId,
    })
    return { success: true, status: MODERATION_STATUS.APPROVED }
  }

  reject(contentId, reason = '', reviewedBy = 'system') {
    const entry = this.#queue.get(contentId)
    if (!entry) return { success: false, error: 'Not in queue' }
    entry.status = MODERATION_STATUS.REJECTED
    entry.reviewedAt = new Date().toISOString()
    entry.reviewedBy = reviewedBy
    entry.reason = reason
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.CONTENT_REJECTED, {
      contentType: entry.contentType,
      contentId,
      reason,
    })
    return { success: true, status: MODERATION_STATUS.REJECTED }
  }

  flag(contentId, reason = '') {
    const entry = this.#queue.get(contentId)
    if (!entry) return { success: false, error: 'Not in queue' }
    entry.status = MODERATION_STATUS.FLAGGED
    entry.reason = reason
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.CONTENT_FLAGGED, {
      contentType: entry.contentType,
      contentId,
      reason,
    })
    return { success: true, status: MODERATION_STATUS.FLAGGED }
  }

  getPending() {
    return Array.from(this.#queue.values())
      .filter(e => e.status === MODERATION_STATUS.PENDING)
  }

  getFlagged() {
    return Array.from(this.#queue.values())
      .filter(e => e.status === MODERATION_STATUS.FLAGGED)
  }

  getStats() {
    const items = Array.from(this.#queue.values())
    return {
      pending: items.filter(i => i.status === MODERATION_STATUS.PENDING).length,
      approved: items.filter(i => i.status === MODERATION_STATUS.APPROVED).length,
      rejected: items.filter(i => i.status === MODERATION_STATUS.REJECTED).length,
      flagged: items.filter(i => i.status === MODERATION_STATUS.FLAGGED).length,
      total: items.length,
    }
  }
}
