import { VISITOR_STATUS } from './visitor.status.js'
import { VISITOR_EVENTS } from './visitor.events.js'
import {
  VisitorNotFoundError,
  VisitorPermissionError,
  VisitorConflictError,
  VisitorStateError,
  VisitorBlacklistError,
  VisitorMergeError,
} from './visitor.errors.js'
import { VisitorWorkflow } from './visitor.workflow.js'
import { validateCreateData, validateUpdateData, validateDuplicateVisitor, validateIdentityConsistency, validateTenantAndDestination } from './visitor.validation.js'
import { VISITOR_PERMISSIONS } from './visitor.permissions.js'
import { createVisitorSchema } from './visitor.schema.js'
import { VisitorProfile } from './visitor.profile.js'
import { VisitorPreferences } from './visitor.preferences.js'
import { VisitorStatistics } from './visitor.statistics.js'
import { VisitorSearch } from './visitor.search.js'

export class VisitorManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.visitor || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #search() {
    return this.#context?.runtime?.search || null
  }

  get #sync() {
    return this.#context?.runtime?.sync || null
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'visitor')
    } catch {
      throw new VisitorPermissionError(`Missing permission: ${permission}`)
    }
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async createVisitor(data, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.CREATE, data)

    validateCreateData(data)
    validateIdentityConsistency(data, identity)
    await validateDuplicateVisitor(data, this.#repo)
    await validateTenantAndDestination(data)

    const now = new Date().toISOString()
    const visitor = createVisitorSchema({
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: VISITOR_STATUS.ANONYMOUS,
      createdBy: identity?.id || null,
      updatedBy: identity?.id || null,
      createdAt: now,
      updatedAt: now,
      profile: data.profile || {},
      preferences: data.preferences || {},
    })

    const saved = await this.#repo?.create(visitor)
    if (!saved) return { success: false, errors: ['Failed to save visitor'] }

    this.#emit(VISITOR_EVENTS.CREATED, { visitor: saved, identity })

    return { success: true, data: saved }
  }

  async getById(id, identity) {
    const visitor = await this.#repo?.findById(id)
    if (!visitor) {
      throw new VisitorNotFoundError(id)
    }
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ, visitor)
    return visitor
  }

  async getMany(filter, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany(filter) || []
  }

  async findByName(name, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany({ 'profile.fullName': { like: `%${name}%` } }) || []
  }

  async findByEmail(email, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findOne({ 'profile.email': email })
  }

  async findByPhone(phone, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findOne({ 'profile.phone': phone })
  }

  async findByIdentity(identityId, identityProvider, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    const filter = { identityId }
    if (identityProvider) filter.identityProvider = identityProvider
    return this.#repo?.findOne(filter)
  }

  async findByReservation(reservationId, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany({ 'reservationIds': { contains: reservationId } }) || []
  }

  async findByBusiness(businessId, identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany({ 'travelHistory.favoriteBusinesses': { contains: businessId } }) || []
  }

  async findVIPVisitors(identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: VISITOR_STATUS.VIP }) || []
  }

  async findBlacklisted(identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany({ 'trust.blacklisted': true }) || []
  }

  async findInactive(identity) {
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.READ)
    return this.#repo?.findMany({ status: VISITOR_STATUS.INACTIVE }) || []
  }

  async updateVisitor(id, data, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    validateUpdateData(data)
    validateIdentityConsistency(data, identity)
    await validateDuplicateVisitor(data, this.#repo, id)

    if (data.profile) {
      data.profile = { ...existing.profile, ...data.profile }
    }

    if (data.preferences) {
      data.preferences = { ...existing.preferences, ...data.preferences }
    }

    const now = new Date().toISOString()
    const updates = { ...data, updatedAt: now, updatedBy: identity?.id || null }

    const saved = await this.#repo?.update({ id }, updates)
    if (!saved) {
      return { success: false, errors: ['Failed to update visitor'] }
    }

    const updated = await this.#repo?.findById(id)

    if (data.profile) {
      this.#emit(VISITOR_EVENTS.PROFILE_UPDATED, { visitor: updated, identity })
    }

    if (data.preferences) {
      this.#emit(VISITOR_EVENTS.PREFERENCES_UPDATED, { visitor: updated, identity })
    }

    this.#emit(VISITOR_EVENTS.UPDATED, { visitor: updated, identity, changes: updates })

    return { success: true, data: updated }
  }

  async updatePreferences(id, preferences, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE_PREFERENCES, existing)

    const updated = VisitorPreferences.create({ ...existing.preferences, ...preferences }).toJSON()
    const now = new Date().toISOString()

    await this.#repo?.update({ id }, { preferences: updated, updatedAt: now, updatedBy: identity?.id || null })

    const visitor = await this.#repo?.findById(id)

    this.#emit(VISITOR_EVENTS.PREFERENCES_UPDATED, { visitor, identity })

    return { success: true, data: visitor }
  }

  async updateProfile(id, profile, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE_PROFILE, existing)

    const updated = VisitorProfile.create({ ...existing.profile, ...profile }).toJSON()
    const now = new Date().toISOString()

    await this.#repo?.update({ id }, { profile: updated, updatedAt: now, updatedBy: identity?.id || null })

    const visitor = await this.#repo?.findById(id)

    this.#emit(VISITOR_EVENTS.PROFILE_UPDATED, { visitor, identity })

    return { success: true, data: visitor }
  }

  async deleteVisitor(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.DELETE, existing)

    if (existing.status === VISITOR_STATUS.DELETED) {
      return { success: true, data: existing }
    }

    VisitorWorkflow.transition(existing, VISITOR_STATUS.DELETED)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: VISITOR_STATUS.DELETED, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.DELETED, { visitor: { ...existing, status: VISITOR_STATUS.DELETED }, identity })

    return { success: true }
  }

  async archiveVisitor(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.ARCHIVE, existing)

    if (existing.status === VISITOR_STATUS.ARCHIVED) {
      return { success: true, data: existing }
    }

    VisitorWorkflow.transition(existing, VISITOR_STATUS.ARCHIVED)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: VISITOR_STATUS.ARCHIVED, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.ARCHIVED, { visitor: { ...existing, status: VISITOR_STATUS.ARCHIVED }, identity })

    return { success: true, data: { ...existing, status: VISITOR_STATUS.ARCHIVED, updatedAt: now } }
  }

  async restoreVisitor(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.RESTORE, existing)

    if (existing.status !== VISITOR_STATUS.ARCHIVED) {
      throw new VisitorStateError(`Cannot restore visitor in status '${existing.status}'`)
    }

    const targetStatus = VISITOR_STATUS.INACTIVE
    VisitorWorkflow.transition(existing, targetStatus)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: targetStatus, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.RESTORED, { visitor: { ...existing, status: targetStatus }, identity })

    return { success: true, data: { ...existing, status: targetStatus, updatedAt: now } }
  }

  async verifyVisitor(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    VisitorWorkflow.transition(existing, VISITOR_STATUS.VERIFIED)
    const now = new Date().toISOString()
    const updates = {
      status: VISITOR_STATUS.VERIFIED,
      'trust.verified': true,
      'trust.verifiedDate': now,
      updatedAt: now,
      updatedBy: identity?.id || null,
    }

    await this.#repo?.update({ id }, updates)

    this.#emit(VISITOR_EVENTS.VERIFIED, { visitor: { ...existing, status: VISITOR_STATUS.VERIFIED }, identity })

    return { success: true, data: { ...existing, ...updates } }
  }

  async activateVisitor(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    VisitorWorkflow.transition(existing, VISITOR_STATUS.ACTIVE)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: VISITOR_STATUS.ACTIVE, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.ACTIVATED, { visitor: { ...existing, status: VISITOR_STATUS.ACTIVE }, identity })

    return { success: true, data: { ...existing, status: VISITOR_STATUS.ACTIVE, updatedAt: now } }
  }

  async deactivateVisitor(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    VisitorWorkflow.transition(existing, VISITOR_STATUS.INACTIVE)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: VISITOR_STATUS.INACTIVE, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.DEACTIVATED, { visitor: { ...existing, status: VISITOR_STATUS.INACTIVE }, identity })

    return { success: true, data: { ...existing, status: VISITOR_STATUS.INACTIVE, updatedAt: now } }
  }

  async grantVIP(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    VisitorWorkflow.transition(existing, VISITOR_STATUS.VIP)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: VISITOR_STATUS.VIP, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.VIP_GRANTED, { visitor: { ...existing, status: VISITOR_STATUS.VIP }, identity })

    return { success: true, data: { ...existing, status: VISITOR_STATUS.VIP, updatedAt: now } }
  }

  async revokeVIP(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    VisitorWorkflow.transition(existing, VISITOR_STATUS.ACTIVE)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: VISITOR_STATUS.ACTIVE, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.VIP_REVOKED, { visitor: { ...existing, status: VISITOR_STATUS.ACTIVE }, identity })

    return { success: true, data: { ...existing, status: VISITOR_STATUS.ACTIVE, updatedAt: now } }
  }

  async blacklistVisitor(id, reason, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    if (existing.trust?.blacklisted) {
      throw new VisitorBlacklistError('Visitor is already blacklisted')
    }

    const now = new Date().toISOString()
    const updates = {
      'trust.blacklisted': true,
      'trust.blacklistReason': reason || null,
      'trust.blacklistedAt': now,
      updatedAt: now,
      updatedBy: identity?.id || null,
    }

    await this.#repo?.update({ id }, updates)

    this.#emit(VISITOR_EVENTS.BLACKLISTED, { visitor: { ...existing, ...updates }, identity, reason })

    return { success: true, data: { ...existing, ...updates } }
  }

  async removeFromBlacklist(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    if (!existing.trust?.blacklisted) {
      throw new VisitorBlacklistError('Visitor is not blacklisted')
    }

    const now = new Date().toISOString()
    const updates = {
      'trust.blacklisted': false,
      'trust.blacklistReason': null,
      'trust.blacklistedAt': null,
      updatedAt: now,
      updatedBy: identity?.id || null,
    }

    await this.#repo?.update({ id }, updates)

    this.#emit(VISITOR_EVENTS.REMOVED_FROM_BLACKLIST, { visitor: { ...existing, ...updates }, identity })

    return { success: true, data: { ...existing, ...updates } }
  }

  async addTag(id, tag, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    const tags = existing.tags || []
    if (tags.includes(tag)) {
      return { success: true, data: existing }
    }

    tags.push(tag)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { tags, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.TAG_ADDED, { visitor: { ...existing, tags }, identity, tag })

    return { success: true, data: { ...existing, tags, updatedAt: now } }
  }

  async removeTag(id, tag, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.UPDATE, existing)

    const tags = (existing.tags || []).filter(t => t !== tag)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { tags, updatedAt: now, updatedBy: identity?.id || null })

    this.#emit(VISITOR_EVENTS.TAG_REMOVED, { visitor: { ...existing, tags }, identity, tag })

    return { success: true, data: { ...existing, tags, updatedAt: now } }
  }

  async mergeVisitors(targetId, sourceId, identity) {
    if (targetId === sourceId) {
      throw new VisitorMergeError('Cannot merge a visitor with itself')
    }

    const target = await this.#repo?.findById(targetId)
    if (!target) {
      throw new VisitorNotFoundError(targetId)
    }

    const source = await this.#repo?.findById(sourceId)
    if (!source) {
      throw new VisitorNotFoundError(sourceId)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.MERGE, target)
    await this.#checkPermission(identity, VISITOR_PERMISSIONS.MERGE, source)

    if (target.tenantId !== source.tenantId) {
      throw new VisitorMergeError('Cannot merge visitors from different tenants')
    }

    const merged = this.#mergeVisitorData(target, source)
    const now = new Date().toISOString()
    merged.updatedAt = now
    merged.updatedBy = identity?.id || null

    await this.#repo?.update({ id: targetId }, merged)
    await this.#repo?.update({ id: sourceId }, { status: VISITOR_STATUS.DELETED, mergedInto: targetId, updatedAt: now })

    this.#emit(VISITOR_EVENTS.MERGED, { target: merged, source, identity })

    return { success: true, data: merged }
  }

  #mergeVisitorData(target, source) {
    const mergedTags = [...new Set([...(target.tags || []), ...(source.tags || [])])]

    const mergedFavorites = {
      destinations: [...new Set([
        ...(target.travelHistory?.favoriteDestinations || []),
        ...(source.travelHistory?.favoriteDestinations || []),
      ])],
      accommodations: [...new Set([
        ...(target.travelHistory?.favoriteAccommodations || []),
        ...(source.travelHistory?.favoriteAccommodations || []),
      ])],
      businesses: [...new Set([
        ...(target.travelHistory?.favoriteBusinesses || []),
        ...(source.travelHistory?.favoriteBusinesses || []),
      ])],
    }

    const targetHistory = target.travelHistory || {}
    const sourceHistory = source.travelHistory || {}

    return {
      ...target,
      tags: mergedTags,
      travelHistory: {
        totalReservations: (targetHistory.totalReservations || 0) + (sourceHistory.totalReservations || 0),
        completedStays: (targetHistory.completedStays || 0) + (sourceHistory.completedStays || 0),
        cancelledReservations: (targetHistory.cancelledReservations || 0) + (sourceHistory.cancelledReservations || 0),
        noShowReservations: (targetHistory.noShowReservations || 0) + (sourceHistory.noShowReservations || 0),
        firstReservationDate: targetHistory.firstReservationDate || sourceHistory.firstReservationDate || null,
        lastReservationDate: sourceHistory.lastReservationDate || targetHistory.lastReservationDate || null,
        favoriteDestinations: mergedFavorites.destinations,
        favoriteAccommodations: mergedFavorites.accommodations,
        favoriteBusinesses: mergedFavorites.businesses,
      },
      profile: {
        ...source.profile,
        ...target.profile,
      },
      preferences: {
        ...source.preferences,
        ...target.preferences,
      },
      metadata: {
        ...(source.metadata || {}),
        ...(target.metadata || {}),
      },
    }
  }

  async calculateStatistics(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) {
      throw new VisitorNotFoundError(id)
    }

    await this.#checkPermission(identity, VISITOR_PERMISSIONS.VIEW_STATISTICS, existing)

    const stats = VisitorStatistics.calculate(existing.travelHistory)

    this.#emit(VISITOR_EVENTS.STATISTICS_UPDATED, { visitor: existing, statistics: stats, identity })

    return stats
  }
}
