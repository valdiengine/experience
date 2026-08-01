import { BUSINESS_VISITOR_EVENTS } from '../business.events.js'
import { BusinessOrchestrationError } from '../business.errors.js'
import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
import { BUSINESS_STATUS } from '../business.status.js'

export class BusinessVisitorManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #visitor() {
    return this.#context?.capabilities?.get?.('visitor')
  }

  get #reservation() {
    return this.#context?.capabilities?.get?.('reservation')
  }

  get #visitorRepo() {
    return this.#context?.repositories?.visitor || null
  }

  get #businessRepo() {
    return this.#context?.repositories?.business || null
  }

  get #reservationManager() {
    return this.#context?.capabilities?.get?.('business')?.manager?.getReservationManager?.()
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'business')
    } catch {
      throw new BusinessOrchestrationError(`Missing permission: ${permission}`)
    }
  }

  async #assertBusinessActive(businessId) {
    const business = await this.#businessRepo?.findById(businessId)
    if (!business) throw new BusinessOrchestrationError(`Business not found: ${businessId}`)
    if (business.status === BUSINESS_STATUS.ARCHIVED) {
      throw new BusinessOrchestrationError('Archived businesses cannot manage visitors')
    }
    if (business.status === BUSINESS_STATUS.DELETED) {
      throw new BusinessOrchestrationError('Deleted businesses cannot manage visitors')
    }
    return business
  }

  async #assertVisitorBelongsToBusiness(visitorId, businessId) {
    const visitor = await this.#visitorRepo?.findById(visitorId)
    if (!visitor) throw new BusinessOrchestrationError(`Visitor not found: ${visitorId}`)
    const linked = await this.#isVisitorLinkedToBusiness(visitor, businessId)
    if (!linked) {
      throw new BusinessOrchestrationError('Visitor does not belong to this business')
    }
    return visitor
  }

  async #isVisitorLinkedToBusiness(visitor, businessId) {
    if (!visitor) return false
    const favorites = visitor.travelHistory?.favoriteBusinesses || []
    if (favorites.includes(businessId)) return true
    try {
      const reservations = await this.#reservationManager?.findByVisitor(businessId, visitor.id, null) || []
      if (reservations.length > 0) return true
    } catch { }
    return false
  }

  #delegateService(method, ...args) {
    const cap = this.#visitor
    if (!cap?.service) throw new BusinessOrchestrationError('Visitor capability not available')
    const fn = cap.service[method]
    if (!fn) throw new BusinessOrchestrationError(`Visitor service method not found: ${method}`)
    return fn.call(cap.service, ...args)
  }

  #delegateManager(method, ...args) {
    const cap = this.#visitor
    if (!cap?.manager) throw new BusinessOrchestrationError('Visitor capability not available')
    const fn = cap.manager[method]
    if (!fn) throw new BusinessOrchestrationError(`Visitor manager method not found: ${method}`)
    return fn.call(cap.manager, ...args)
  }

  getVisitorCapability() {
    return this.#visitor
  }

  async #linkVisitorToBusiness(visitorId, businessId, identity) {
    const visitor = await this.#visitorRepo?.findById(visitorId)
    if (!visitor) return null
    const favorites = visitor.travelHistory?.favoriteBusinesses || []
    if (!favorites.includes(businessId)) {
      favorites.push(businessId)
      await this.#visitorRepo?.update({ id: visitorId }, {
        'travelHistory.favoriteBusinesses': favorites,
        updatedAt: new Date().toISOString(),
        updatedBy: identity?.id || null,
      })
    }
    return { ...visitor, travelHistory: { ...(visitor.travelHistory || {}), favoriteBusinesses: favorites } }
  }

  // ── Visitor Lifecycle ──

  async createVisitor(businessId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegateService('create', { ...data }, identity)
    if (result?.success && result?.data?.id) {
      await this.#linkVisitorToBusiness(result.data.id, businessId, identity)
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_CREATED, { businessId, visitorId: result.data.id, visitor: result.data, identity })
    }
    return result
  }

  async updateVisitor(businessId, visitorId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('update', visitorId, data, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_UPDATED, { businessId, visitorId, changes: data, identity })
    }
    return result
  }

  async archiveVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('archive', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ARCHIVED, { businessId, visitorId, identity })
    }
    return result
  }

  async restoreVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('restore', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_RESTORED, { businessId, visitorId, identity })
    }
    return result
  }

  async deleteVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('delete', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_DELETED, { businessId, visitorId, identity })
    }
    return result
  }

  async mergeVisitors(businessId, targetId, sourceId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(targetId, businessId)
    await this.#assertVisitorBelongsToBusiness(sourceId, businessId)
    const result = await this.#delegateService('merge', targetId, sourceId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_MERGED, { businessId, targetId, sourceId, visitor: result.data, identity })
    }
    return result
  }

  async activateVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('activate', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ACTIVATED, { businessId, visitorId, identity })
    }
    return result
  }

  async deactivateVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('deactivate', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_DEACTIVATED, { businessId, visitorId, identity })
    }
    return result
  }

  async verifyVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('verify', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_VERIFIED, { businessId, visitorId, identity })
    }
    return result
  }

  async grantVip(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('grantVIP', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_VIP_GRANTED, { businessId, visitorId, identity })
    }
    return result
  }

  async revokeVip(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('revokeVIP', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_VIP_REVOKED, { businessId, visitorId, identity })
    }
    return result
  }

  async blacklistVisitor(businessId, visitorId, reason, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('blacklist', visitorId, reason, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_BLACKLISTED, { businessId, visitorId, reason, identity })
    }
    return result
  }

  async unblacklistVisitor(businessId, visitorId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('removeFromBlacklist', visitorId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_UNBLACKLISTED, { businessId, visitorId, identity })
    }
    return result
  }

  async updateVisitorProfile(businessId, visitorId, profile, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('updateProfile', visitorId, profile, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_PROFILE_UPDATED, { businessId, visitorId, profile, identity })
    }
    return result
  }

  async updateVisitorPreferences(businessId, visitorId, preferences, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const result = await this.#delegateService('updatePreferences', visitorId, preferences, identity)
    if (result?.success) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_PREFERENCES_UPDATED, { businessId, visitorId, preferences, identity })
    }
    return result
  }

  async updateVisitorTags(businessId, visitorId, tags, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const visitor = await this.#visitorRepo?.findById(visitorId)
    const current = new Set(visitor?.tags || [])
    const target = new Set(tags || [])
    let changed = false
    for (const tag of target) {
      if (!current.has(tag)) {
        await this.#delegateService('addTag', visitorId, tag, identity)
        changed = true
      }
    }
    for (const tag of current) {
      if (!target.has(tag)) {
        await this.#delegateService('removeTag', visitorId, tag, identity)
        changed = true
      }
    }
    if (changed) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_TAGS_UPDATED, { businessId, visitorId, tags: [...target], identity })
    }
    return { success: true, data: { ...visitor, tags: [...target] } }
  }

  // ── Visitor Queries ──

  async getVisitor(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitor = await this.#visitorRepo?.findById(visitorId)
    if (!visitor) return null
    const linked = await this.#isVisitorLinkedToBusiness(visitor, businessId)
    if (!linked) throw new BusinessOrchestrationError('Visitor does not belong to this business')
    return visitor
  }

  async findVisitor(businessId, visitorId, identity) {
    return this.getVisitor(businessId, visitorId, identity)
  }

  async findVisitorByEmail(businessId, email, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitor = await this.#delegateService('findByEmail', email, identity)
    if (!visitor) return null
    const linked = await this.#isVisitorLinkedToBusiness(visitor, businessId)
    return linked ? visitor : null
  }

  async findVisitorByPhone(businessId, phone, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitor = await this.#delegateService('findByPhone', phone, identity)
    if (!visitor) return null
    const linked = await this.#isVisitorLinkedToBusiness(visitor, businessId)
    return linked ? visitor : null
  }

  async findVisitors(businessId, filter, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitors = await this.getBusinessVisitors(businessId, identity)
    if (!filter) return visitors
    const status = filter.status
    if (status) return visitors.filter((v) => v.status === status)
    if (filter.tags?.length) return visitors.filter((v) => (v.tags || []).some((t) => filter.tags.includes(t)))
    if (filter.segment) return visitors.filter((v) => this.#segmentVisitor(v) === filter.segment)
    return visitors
  }

  async listVisitors(businessId, options, identity) {
    return this.findVisitors(businessId, options, identity)
  }

  async searchVisitors(businessId, query, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitors = await this.getBusinessVisitors(businessId, identity)
    const q = String(query || '').toLowerCase().trim()
    if (!q) return visitors
    return visitors.filter((v) => {
      const haystack = [
        v.id,
        v.profile?.fullName,
        v.profile?.email,
        v.profile?.phone,
        v.profile?.preferredName,
        ...(v.tags || []),
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }

  async visitorExists(businessId, visitorId, identity) {
    const visitor = await this.getVisitor(businessId, visitorId, identity)
    return !!visitor
  }

  async countVisitors(businessId, identity) {
    const visitors = await this.getBusinessVisitors(businessId, identity)
    return visitors.length
  }

  async getBusinessVisitors(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitorIds = new Set()
    try {
      const reservations = await this.#reservationManager?.findByBusiness(businessId, identity) || []
      for (const r of reservations) {
        if (r.visitorId) visitorIds.add(r.visitorId)
      }
    } catch { }
    const favorites = await this.#visitorRepo?.findMany({ 'travelHistory.favoriteBusinesses': { contains: businessId } }) || []
    for (const v of favorites) visitorIds.add(v.id)
    const visitors = []
    for (const id of visitorIds) {
      const visitor = await this.#visitorRepo?.findById(id)
      if (visitor) visitors.push(visitor)
    }
    return visitors
  }

  // ── Reservation Coordination ──

  async attachReservation(businessId, visitorId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const reservation = await this.#reservationManager?.getReservation(businessId, reservationId, identity)
    if (!reservation) throw new BusinessOrchestrationError(`Reservation not found: ${reservationId}`)
    if (reservation.visitorId && reservation.visitorId !== visitorId) {
      throw new BusinessOrchestrationError('Reservation is already linked to another visitor')
    }
    await this.#delegateReservationService('updateReservation', reservationId, { visitorId }, identity)
    await this.#linkVisitorToBusiness(visitorId, businessId, identity)
    this.#emit(BUSINESS_VISITOR_EVENTS.RESERVATION_ATTACHED, { businessId, visitorId, reservationId, identity })
    return { success: true, data: { ...reservation, visitorId } }
  }

  async detachReservation(businessId, visitorId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    const reservation = await this.#reservationManager?.getReservation(businessId, reservationId, identity)
    if (!reservation) throw new BusinessOrchestrationError(`Reservation not found: ${reservationId}`)
    await this.#delegateReservationService('updateReservation', reservationId, { visitorId: null }, identity)
    this.#emit(BUSINESS_VISITOR_EVENTS.RESERVATION_DETACHED, { businessId, visitorId, reservationId, identity })
    return { success: true, data: { ...reservation, visitorId: null } }
  }

  async getVisitorReservations(businessId, visitorId, identity) {
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    return this.#reservationManager?.findByVisitor(businessId, visitorId, identity) || []
  }

  async getReservationHistory(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    return reservations.sort((a, b) => (b.dates?.checkIn || '').localeCompare(a.dates?.checkIn || ''))
  }

  async getCurrentReservation(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    return reservations.find((r) => r.status === 'confirmed' || r.status === 'checked_in') || null
  }

  async getUpcomingReservations(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    const now = new Date().toISOString().split('T')[0]
    return reservations.filter((r) =>
      (r.status === 'confirmed' || r.status === 'checked_in') && r.dates?.checkIn >= now
    ).sort((a, b) => (a.dates?.checkIn || '').localeCompare(b.dates?.checkIn || ''))
  }

  async getPastReservations(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    return reservations.filter((r) =>
      r.status === 'completed' || r.status === 'cancelled' || r.status === 'no_show' || r.status === 'rejected' || r.status === 'expired'
    )
  }

  async calculateLifetimeValue(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    const completed = reservations.filter((r) => r.status === 'completed')
    const lifetimeValue = completed.reduce((sum, r) => sum + (r.totalPrice || 0), 0)
    return { businessId, visitorId, lifetimeValue, completedReservations: completed.length, totalReservations: reservations.length }
  }

  async calculateAverageStay(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    const completed = reservations.filter((r) => r.status === 'completed')
    let totalNights = 0
    for (const r of completed) {
      totalNights += this.#calculateNights(r.dates?.checkIn, r.dates?.checkOut)
    }
    const averageStay = completed.length > 0 ? Math.round((totalNights / completed.length) * 10) / 10 : 0
    return { businessId, visitorId, averageStay, completedStays: completed.length, totalNights }
  }

  async calculateCancellationRate(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    const cancelled = reservations.filter((r) => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired')
    const rate = reservations.length > 0 ? Math.round((cancelled.length / reservations.length) * 100) : 0
    return { businessId, visitorId, cancellationRate: rate, totalReservations: reservations.length, cancelled: cancelled.length }
  }

  async calculateNoShowRate(businessId, visitorId, identity) {
    const reservations = await this.getVisitorReservations(businessId, visitorId, identity)
    const noShows = reservations.filter((r) => r.status === 'no_show')
    const rate = reservations.length > 0 ? Math.round((noShows.length / reservations.length) * 100) : 0
    return { businessId, visitorId, noShowRate: rate, totalReservations: reservations.length, noShows: noShows.length }
  }

  #delegateReservationService(method, ...args) {
    const cap = this.#reservation
    if (!cap?.service) throw new BusinessOrchestrationError('Reservation capability not available')
    const fn = cap.service[method]
    if (!fn) throw new BusinessOrchestrationError(`Reservation service method not found: ${method}`)
    return fn.call(cap.service, ...args)
  }

  // ── Analytics ──

  async getVisitorStatistics(businessId, visitorId, identity) {
    await this.#assertVisitorBelongsToBusiness(visitorId, businessId)
    return this.#delegateService('calculateStatistics', visitorId, identity)
  }

  async calculateBusinessVisitorMetrics(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitors = await this.getBusinessVisitors(businessId, identity)
    const active = visitors.filter((v) => v.status === 'active' || v.status === 'vip')
    const vip = visitors.filter((v) => v.status === 'vip')
    const verified = visitors.filter((v) => v.status === 'verified' || v.trust?.verified)
    const blacklisted = visitors.filter((v) => v.trust?.blacklisted)
    const returning = visitors.filter((v) => (v.travelHistory?.totalReservations || 0) >= 2)

    let totalLifetimeValue = 0
    let totalStays = 0
    let totalReservations = 0
    let cancelled = 0
    let noShows = 0
    const tags = new Set()
    const languages = new Set()
    const countries = new Set()

    for (const v of visitors) {
      totalLifetimeValue += (v.travelHistory?.totalReservations || 0) > 0 ? this.#approximateLifetimeValue(v) : 0
      totalStays += v.travelHistory?.completedStays || 0
      totalReservations += v.travelHistory?.totalReservations || 0
      cancelled += v.travelHistory?.cancelledReservations || 0
      noShows += v.travelHistory?.noShowReservations || 0
      for (const t of v.tags || []) tags.add(t)
      if (v.profile?.language) languages.add(v.profile.language)
      if (v.profile?.country) countries.add(v.profile.country)
    }

    const topVisitor = visitors.length > 0
      ? visitors.sort((a, b) => this.#approximateLifetimeValue(b) - this.#approximateLifetimeValue(a))[0]
      : null
    const lastVisitor = visitors.length > 0
      ? visitors.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0]
      : null

    return {
      businessId,
      visitorCount: visitors.length,
      activeVisitors: active.length,
      vipVisitors: vip.length,
      verifiedVisitors: verified.length,
      blacklistedVisitors: blacklisted.length,
      repeatVisitors: returning.length,
      repeatRate: visitors.length > 0 ? Math.round((returning.length / visitors.length) * 100) : 0,
      cancellationRate: totalReservations > 0 ? Math.round((cancelled / totalReservations) * 100) : 0,
      noShowRate: totalReservations > 0 ? Math.round((noShows / totalReservations) * 100) : 0,
      averageStay: null,
      averageLifetimeValue: null,
      totalLifetimeValue,
      totalStays,
      totalReservations,
      topVisitor: topVisitor ? { id: topVisitor.id, fullName: topVisitor.profile?.fullName, lifetimeValue: this.#approximateLifetimeValue(topVisitor) } : null,
      lastVisitor: lastVisitor ? { id: lastVisitor.id, fullName: lastVisitor.profile?.fullName, updatedAt: lastVisitor.updatedAt } : null,
      visitorTags: [...tags],
      visitorLanguages: [...languages],
      visitorCountries: [...countries],
      visitorSegments: this.#segmentCounts(visitors),
    }
  }

  async refreshVisitorStatistics(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const metrics = await this.calculateBusinessVisitorMetrics(businessId, identity)
    const fields = {
      visitorCount: metrics.visitorCount,
      activeVisitors: metrics.activeVisitors,
      vipVisitors: metrics.vipVisitors,
      verifiedVisitors: metrics.verifiedVisitors,
      blacklistedVisitors: metrics.blacklistedVisitors,
      averageLifetimeValue: metrics.averageLifetimeValue,
      averageStay: metrics.averageStay,
      repeatRate: metrics.repeatRate,
      cancellationRate: metrics.cancellationRate,
      noShowRate: metrics.noShowRate,
      topVisitor: metrics.topVisitor,
      lastVisitor: metrics.lastVisitor,
      visitorTags: metrics.visitorTags,
      visitorLanguages: metrics.visitorLanguages,
      visitorCountries: metrics.visitorCountries,
      visitorSegments: metrics.visitorSegments,
      lastVisitorSync: new Date().toISOString(),
    }
    await this.#businessRepo?.update({ id: businessId }, fields)
    this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_STATISTICS_UPDATED, { businessId, ...fields, identity })
    return { businessId, ...fields }
  }

  async syncVisitorStatistics(businessId, identity) {
    return this.refreshVisitorStatistics(businessId, identity)
  }

  async calculateVisitorSegments(businessId, identity) {
    const visitors = await this.getBusinessVisitors(businessId, identity)
    return this.#segmentCounts(visitors)
  }

  async calculateTopVisitors(businessId, limit, identity) {
    const visitors = await this.getBusinessVisitors(businessId, identity)
    return visitors
      .map((v) => ({ visitor: v, lifetimeValue: this.#approximateLifetimeValue(v) }))
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
      .slice(0, limit || 10)
      .map(({ visitor, lifetimeValue }) => ({
        id: visitor.id,
        fullName: visitor.profile?.fullName,
        email: visitor.profile?.email,
        status: visitor.status,
        lifetimeValue,
        totalReservations: visitor.travelHistory?.totalReservations || 0,
      }))
  }

  async calculateReturningVisitors(businessId, identity) {
    const visitors = await this.getBusinessVisitors(businessId, identity)
    return visitors.filter((v) => (v.travelHistory?.totalReservations || 0) >= 2)
  }

  async calculateVipVisitors(businessId, identity) {
    const visitors = await this.getBusinessVisitors(businessId, identity)
    return visitors.filter((v) => v.status === 'vip')
  }

  #segmentVisitor(visitor) {
    if (!visitor) return 'unknown'
    if (visitor.status === 'archived' || visitor.status === 'deleted') return visitor.status
    if (visitor.trust?.blacklisted) return 'blacklisted'
    if (visitor.status === 'vip') return 'vip'
    const reservations = visitor.travelHistory?.totalReservations || 0
    if (reservations >= 2) return 'returning'
    if (reservations === 1) return 'first_time'
    if (visitor.status === 'inactive') return 'inactive'
    return 'new'
  }

  #segmentCounts(visitors) {
    const counts = { new: 0, first_time: 0, returning: 0, vip: 0, inactive: 0, blacklisted: 0, archived: 0, deleted: 0, unknown: 0 }
    for (const v of visitors) {
      const segment = this.#segmentVisitor(v)
      if (counts[segment] === undefined) counts[segment] = 0
      counts[segment]++
    }
    return counts
  }

  #approximateLifetimeValue(visitor) {
    const history = visitor.travelHistory || {}
    const values = history.reservationValues || []
    if (values.length > 0) return values.reduce((a, b) => a + b, 0)
    return (history.totalReservations || 0) * (history.averageReservationValue || 0)
  }

  // ── Batch Operations ──

  async archiveManyVisitors(businessId, visitorIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of visitorIds) {
      try {
        await this.archiveVisitor(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ visitorId: id, error: err.message })
      }
    }
    return results
  }

  async restoreManyVisitors(businessId, visitorIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of visitorIds) {
      try {
        await this.restoreVisitor(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ visitorId: id, error: err.message })
      }
    }
    return results
  }

  async deleteManyVisitors(businessId, visitorIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of visitorIds) {
      try {
        await this.deleteVisitor(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ visitorId: id, error: err.message })
      }
    }
    return results
  }

  async mergeManyVisitors(businessId, visitorIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    if (visitorIds.length < 2) return results
    const targetId = visitorIds[0]
    for (const sourceId of visitorIds.slice(1)) {
      try {
        await this.mergeVisitors(businessId, targetId, sourceId, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ visitorId: sourceId, error: err.message })
      }
    }
    return results
  }

  async tagManyVisitors(businessId, visitorIds, tag, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of visitorIds) {
      try {
        await this.#assertVisitorBelongsToBusiness(id, businessId)
        await this.#delegateService('addTag', id, tag, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ visitorId: id, error: err.message })
      }
    }
    if (results.succeeded > 0) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_TAGS_UPDATED, { businessId, visitorIds, tag, identity })
    }
    return results
  }

  async exportVisitors(businessId, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const visitors = await this.findVisitors(businessId, options, identity)
    const now = new Date().toISOString()
    const data = visitors.map((v) => ({
      id: v.id,
      status: v.status,
      fullName: v.profile?.fullName || null,
      email: v.profile?.email || null,
      phone: v.profile?.phone || null,
      language: v.profile?.language || null,
      country: v.profile?.country || null,
      tags: v.tags || [],
      totalReservations: v.travelHistory?.totalReservations || 0,
      completedStays: v.travelHistory?.completedStays || 0,
      cancellationRate: (v.travelHistory?.totalReservations || 0) > 0
        ? Math.round(((v.travelHistory?.cancelledReservations || 0) / (v.travelHistory?.totalReservations || 1)) * 100)
        : 0,
      lifetimeValue: this.#approximateLifetimeValue(v),
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }))
    return { businessId, exportedAt: now, total: data.length, data }
  }

  // ── Search Integration ──

  async refreshVisitorSearch(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const search = this.#context?.runtime?.search
    const visitors = await this.getBusinessVisitors(businessId, identity)
    let indexed = 0
    for (const v of visitors) {
      try {
        await search?.index?.('visitor', { ...v, businessId })
        indexed++
      } catch { }
    }
    this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_SEARCH_UPDATED, { businessId, indexed, total: visitors.length, identity })
    return { businessId, indexed, total: visitors.length }
  }

  // ── Business Rules: Cascade ──

  async cascadeArchive(businessId, identity) {
    try {
      const visitors = await this.getBusinessVisitors(businessId, null)
      for (const v of visitors) {
        if (v.status === 'archived' || v.status === 'deleted') continue
        await this.#delegateService('archive', v.id, null)
      }
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ARCHIVED, { businessId, action: 'cascade_archive', identity })
    } catch (err) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ERROR, { businessId, action: 'cascade_archive', error: err.message })
    }
  }

  async cascadeRestore(businessId, identity) {
    try {
      const visitors = await this.getBusinessVisitors(businessId, null)
      for (const v of visitors) {
        if (v.status !== 'archived') continue
        await this.#delegateService('restore', v.id, null)
      }
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_RESTORED, { businessId, action: 'cascade_restore', identity })
    } catch (err) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ERROR, { businessId, action: 'cascade_restore', error: err.message })
    }
  }

  async cascadeDelete(businessId, identity) {
    try {
      const visitors = await this.getBusinessVisitors(businessId, null)
      for (const v of visitors) {
        if (v.status === 'archived' || v.status === 'deleted') continue
        await this.#delegateService('archive', v.id, null)
      }
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ARCHIVED, { businessId, action: 'cascade_delete', identity })
    } catch (err) {
      this.#emit(BUSINESS_VISITOR_EVENTS.VISITOR_ERROR, { businessId, action: 'cascade_delete', error: err.message })
    }
  }

  // ── Utility ──

  #calculateNights(checkIn, checkOut) {
    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0
    return Math.max(0, Math.floor((outDate - inDate) / 86400000))
  }
}
