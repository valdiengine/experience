/**
 * Visitor Profile — Manages visitor profiles in the ecosystem
 *
 * Business-agnostic: visitors explore destinations, not businesses.
 * No direct capability imports — uses context.capabilities.get()
 */
import { VISITOR_SCHEMA } from '../community.schema.js'
import { COMMUNITY_EVENTS } from '../community.events.js'

export class VisitorProfile {
  #context = null
  #visitors = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Register or get visitor profile
   * @param {object} data - Visitor data
   * @returns {object}
   */
  register(data) {
    const existing = this.#findByUserId(data.userId)
    if (existing) return { success: true, visitor: existing, isNew: false }

    const id = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const visitor = {
      id,
      userId: data.userId,
      displayName: data.displayName || 'Visitor',
      avatar: data.avatar || null,
      country: data.country || null,
      interests: data.interests || [],
      visitedDestinations: [],
      visitedLocalities: [],
      discoveredPlaces: [],
      memoriesCount: 0,
      reviewsCount: 0,
      reputationScore: 0,
      badges: [],
      createdAt: new Date().toISOString(),
    }

    const validation = VISITOR_SCHEMA.validate(visitor)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    this.#visitors.set(id, visitor)
    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.VISITOR_REGISTERED, { visitor })

    return { success: true, visitor, isNew: true }
  }

  /**
   * Get visitor by profile ID
   * @param {string} id - Profile ID
   * @returns {object|null}
   */
  getById(id) {
    return this.#visitors.get(id) || null
  }

  /**
   * Get visitor by user ID
   * @param {string} userId - User ID
   * @returns {object|null}
   */
  getByUserId(userId) {
    return this.#findByUserId(userId)
  }

  /**
   * Update visitor profile
   * @param {string} id - Profile ID
   * @param {object} updates
   * @returns {object}
   */
  update(id, updates) {
    const visitor = this.#visitors.get(id)
    if (!visitor) return { success: false, error: 'Visitor not found' }

    const allowed = ['displayName', 'avatar', 'country', 'interests']
    for (const key of allowed) {
      if (updates[key] !== undefined) visitor[key] = updates[key]
    }

    this.#context?.eventBus?.emit(COMMUNITY_EVENTS.VISITOR_UPDATED, { visitor })
    return { success: true, visitor }
  }

  /**
   * Record a destination visit
   * @param {string} id - Profile ID
   * @param {string} destinationId
   */
  recordDestinationVisit(id, destinationId) {
    const visitor = this.#visitors.get(id)
    if (!visitor) return
    if (!visitor.visitedDestinations.includes(destinationId)) {
      visitor.visitedDestinations.push(destinationId)
    }
  }

  /**
   * Record a locality visit
   * @param {string} id - Profile ID
   * @param {string} localityId
   */
  recordLocalityVisit(id, localityId) {
    const visitor = this.#visitors.get(id)
    if (!visitor) return
    if (!visitor.visitedLocalities.includes(localityId)) {
      visitor.visitedLocalities.push(localityId)
    }
  }

  /**
   * Record a place discovery
   * @param {string} id - Profile ID
   * @param {string} placeId
   */
  recordPlaceDiscovery(id, placeId) {
    const visitor = this.#visitors.get(id)
    if (!visitor) return
    if (!visitor.discoveredPlaces.includes(placeId)) {
      visitor.discoveredPlaces.push(placeId)
    }
  }

  /**
   * Increment memory count
   * @param {string} id - Profile ID
   */
  incrementMemories(id) {
    const visitor = this.#visitors.get(id)
    if (visitor) visitor.memoriesCount = (visitor.memoriesCount || 0) + 1
  }

  /**
   * Increment review count
   * @param {string} id - Profile ID
   */
  incrementReviews(id) {
    const visitor = this.#visitors.get(id)
    if (visitor) visitor.reviewsCount = (visitor.reviewsCount || 0) + 1
  }

  /**
   * Get all visitors (admin)
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#visitors.values())
  }

  #findByUserId(userId) {
    return Array.from(this.#visitors.values()).find(v => v.userId === userId) || null
  }
}
