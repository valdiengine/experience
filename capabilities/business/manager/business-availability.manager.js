import { BUSINESS_AVAILABILITY_EVENTS } from '../business.events.js'
import { BusinessOrchestrationError } from '../business.errors.js'
import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
import { BUSINESS_STATUS } from '../business.status.js'

export class BusinessAvailabilityManager {
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

  get #availability() {
    return this.#context?.capabilities?.get?.('availability')
  }

  get #availabilityRepo() {
    return this.#context?.repositories?.availability || null
  }

  get #accommodationRepo() {
    return this.#context?.repositories?.accommodation || null
  }

  get #businessRepo() {
    return this.#context?.repositories?.business || null
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'business')
    } catch {
      throw new Error(`Missing permission: ${permission}`)
    }
  }

  async #assertBusinessActive(businessId) {
    const business = await this.#businessRepo?.findById(businessId)
    if (!business) throw new BusinessOrchestrationError(`Business not found: ${businessId}`)
    if (business.status === BUSINESS_STATUS.ARCHIVED) {
      throw new BusinessOrchestrationError('Archived businesses cannot manage availability')
    }
    if (business.status === BUSINESS_STATUS.DELETED) {
      throw new BusinessOrchestrationError('Deleted businesses cannot manage availability')
    }
    return business
  }

  async #getAccommodationIds(businessId) {
    const accommodations = await this.#accommodationRepo?.findMany({ businessId }) || []
    return accommodations.map((a) => a.id)
  }

  #delegate(method, ...args) {
    const cap = this.#availability
    if (!cap?.service) throw new BusinessOrchestrationError('Availability capability not available')
    const fn = cap.service[method]
    if (!fn) throw new BusinessOrchestrationError(`Availability method not found: ${method}`)
    return fn.call(cap.service, ...args)
  }

  #delegateManager(method, ...args) {
    const cap = this.#availability
    if (!cap?.manager) throw new BusinessOrchestrationError('Availability capability not available')
    const fn = cap.manager[method]
    if (!fn) throw new BusinessOrchestrationError(`Availability manager method not found: ${method}`)
    return fn.call(cap.manager, ...args)
  }

  // ── Single Accommodation Availability ──

  async getAccommodationAvailability(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegate('getCalendar', accommodationId, startDate, endDate, identity)
  }

  async getAccommodationOccupancy(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegate('getOccupancy', accommodationId, startDate, endDate, identity)
  }

  async checkAccommodationAvailability(accommodationId, checkIn, checkOut, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegate('checkAvailability', accommodationId, checkIn, checkOut, identity)
  }

  async getAccommodationCalendarSummary(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegate('getCalendarSummary', accommodationId, startDate, endDate, identity)
  }

  async blockAccommodation(accommodationId, startDate, endDate, reason, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('block', accommodationId, startDate, endDate, reason, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.DAY_BLOCKED, { accommodationId, startDate, endDate, reason, identity })
    return result
  }

  async unblockAccommodation(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('unblock', accommodationId, startDate, endDate, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.DAY_UNBLOCKED, { accommodationId, startDate, endDate, identity })
    return result
  }

  async reserveAccommodation(accommodationId, checkIn, checkOut, reservationId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('reserve', accommodationId, checkIn, checkOut, reservationId, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.DAY_RESERVED, { accommodationId, checkIn, checkOut, reservationId, identity })
    return result
  }

  async releaseReservation(accommodationId, checkIn, checkOut, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('release', accommodationId, checkIn, checkOut, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.DAY_RELEASED, { accommodationId, checkIn, checkOut, identity })
    return result
  }

  // ── Season ──

  async applySeason(accommodationId, seasonData, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('createSeason', { accommodationId, ...seasonData }, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.SEASON_APPLIED, { accommodationId, season: result?.data, identity })
    return result
  }

  async removeSeason(seasonId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegateManager('deleteRule', seasonId, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.SEASON_REMOVED, { seasonId, identity })
    return result
  }

  // ── Rule ──

  async applyRule(accommodationId, ruleData, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('createRule', { accommodationId, ...ruleData }, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.RULE_APPLIED, { accommodationId, rule: result?.data, identity })
    return result
  }

  async removeRule(ruleId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const result = await this.#delegate('deleteRule', ruleId, identity)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.RULE_REMOVED, { ruleId, identity })
    return result
  }

  async updateRule(ruleId, ruleData, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.#delegate('updateRule', ruleId, ruleData, identity)
  }

  // ── Window ──

  async createWindow(accommodationId, windowData, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.#delegate('createWindow', { accommodationId, ...windowData }, identity)
  }

  // ── Block (persistent block record) ──

  async createBlock(accommodationId, blockData, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    return this.#delegate('createBlock', { accommodationId, ...blockData }, identity)
  }

  // ── Business-Level Aggregation ──

  async getBusinessAvailability(businessId, startDate, endDate, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const ids = await this.#getAccommodationIds(businessId)
    const results = {}
    for (const id of ids) {
      results[id] = await this.#delegate('getCalendar', id, startDate, endDate, identity)
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.AVAILABILITY_VIEWED, { businessId, startDate, endDate, identity })
    return { businessId, startDate, endDate, accommodationCount: ids.length, results }
  }

  async getBusinessCalendar(businessId, startDate, endDate, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const ids = await this.#getAccommodationIds(businessId)
    const results = {}
    for (const id of ids) {
      results[id] = await this.#delegate('getCalendar', id, startDate, endDate, identity)
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.CALENDAR_VIEWED, { businessId, startDate, endDate, identity })
    return { businessId, startDate, endDate, accommodationCount: ids.length, results }
  }

  async getBusinessOccupancy(businessId, startDate, endDate, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const ids = await this.#getAccommodationIds(businessId)
    let totalUnits = 0
    let totalBlocked = 0
    const perAccommodation = {}
    for (const id of ids) {
      const occ = await this.#delegate('getOccupancy', id, startDate, endDate, identity)
      perAccommodation[id] = occ
      totalUnits += occ.total || 0
      totalBlocked += occ.blocked || 0
    }
    const overallPercent = totalUnits > 0 ? Math.round((totalBlocked / totalUnits) * 100) : 0
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.OCCUPANCY_VIEWED, { businessId, startDate, endDate, identity })
    return {
      businessId, startDate, endDate,
      totalUnits, totalBlocked, availableUnits: totalUnits - totalBlocked,
      occupancyPercent: overallPercent,
      perAccommodation,
    }
  }

  // ── Batch Operations ──

  async blockMany(businessId, accommodationIds, startDate, endDate, reason, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = {}
    for (const id of accommodationIds) {
      results[id] = await this.#delegate('block', id, startDate, endDate, reason, identity)
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.BULK_UPDATED, { businessId, accommodationIds, startDate, endDate, action: 'block', identity })
    return { businessId, accommodationCount: accommodationIds.length, results }
  }

  async unblockMany(businessId, accommodationIds, startDate, endDate, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = {}
    for (const id of accommodationIds) {
      results[id] = await this.#delegate('unblock', id, startDate, endDate, identity)
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.BULK_UPDATED, { businessId, accommodationIds, startDate, endDate, action: 'unblock', identity })
    return { businessId, accommodationCount: accommodationIds.length, results }
  }

  // ── Copy & Duplicate ──

  async copyAvailability(sourceAccommodationId, targetAccommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const sourceCalendar = await this.#delegate('getCalendar', sourceAccommodationId, startDate, endDate, identity)
    const results = []
    for (const day of sourceCalendar) {
      if (day.status !== 'available') {
        const r = await this.#delegate('block', targetAccommodationId, day.date, day.date, day.notes || `Copied from ${sourceAccommodationId}`, identity)
        results.push(r)
      }
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.CALENDAR_COPIED, { sourceAccommodationId, targetAccommodationId, startDate, endDate, identity })
    return { sourceAccommodationId, targetAccommodationId, startDate, endDate, entriesCopied: results.length }
  }

  async duplicateCalendar(sourceBusinessId, targetBusinessId, startDate, endDate, identity) {
    await this.#assertBusinessActive(sourceBusinessId)
    await this.#assertBusinessActive(targetBusinessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const sourceIds = await this.#getAccommodationIds(sourceBusinessId)
    const targetIds = await this.#getAccommodationIds(targetBusinessId)
    const mapping = {}
    for (let i = 0; i < Math.min(sourceIds.length, targetIds.length); i++) {
      const result = await this.copyAvailability(sourceIds[i], targetIds[i], startDate, endDate, identity)
      mapping[sourceIds[i]] = { targetId: targetIds[i], entriesCopied: result.entriesCopied }
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.CALENDAR_DUPLICATED, { sourceBusinessId, targetBusinessId, startDate, endDate, identity })
    return { sourceBusinessId, targetBusinessId, pairsProcessed: Object.keys(mapping).length, mapping }
  }

  // ── Bulk Update ──

  async bulkAvailabilityUpdate(businessId, updates, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { blocked: 0, unblocked: 0, errors: [] }
    for (const update of updates) {
      try {
        if (update.action === 'block') {
          await this.#delegate('block', update.accommodationId, update.startDate, update.endDate, update.reason, identity)
          results.blocked++
        } else if (update.action === 'unblock') {
          await this.#delegate('unblock', update.accommodationId, update.startDate, update.endDate, identity)
          results.unblocked++
        }
      } catch (err) {
        results.errors.push({ accommodationId: update.accommodationId, error: err.message })
      }
    }
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.BULK_UPDATED, { businessId, action: 'bulk', updateCount: updates.length, identity })
    return { businessId, ...results }
  }

  // ── Statistics & Sync ──

  async recalculateOccupancy(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const ids = await this.#getAccommodationIds(businessId)
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split('T')[0]
    let totalUnits = 0
    let totalBlocked = 0
    for (const id of ids) {
      const occ = await this.#delegate('getOccupancy', id, startDate, endDate, identity)
      totalUnits += occ.total || 0
      totalBlocked += occ.blocked || 0
    }
    const occupancyRate = totalUnits > 0 ? Math.round((totalBlocked / totalUnits) * 100) : 0
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.OCCUPANCY_RECALCULATED, { businessId, occupancyRate, identity })
    return { businessId, occupancyRate, totalUnits, totalBlocked }
  }

  async syncAvailabilityStatistics(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const ids = await this.#getAccommodationIds(businessId)
    let totalBookableDays = 0
    let totalBlockedDays = 0
    let totalReservedDays = 0
    let totalSeasons = 0
    let totalRules = 0
    const now = new Date().toISOString().split('T')[0]
    for (const id of ids) {
      const days = await this.#availabilityRepo?.findMany({ accommodationId: id }) || []
      totalBookableDays += days.length
      totalBlockedDays += days.filter((d) => d.status === 'blocked' || d.status === 'maintenance').length
      totalReservedDays += days.filter((d) => d.status === 'reserved').length
    }
    const searchFields = {
      occupancyRate: totalBookableDays > 0 ? Math.round(((totalBlockedDays + totalReservedDays) / totalBookableDays) * 100) : 0,
      totalBookableDays,
      blockedDays: totalBlockedDays,
      reservedDays: totalReservedDays,
      availableDays: totalBookableDays - totalBlockedDays - totalReservedDays,
      totalSeasons,
      activeRulesCount: totalRules,
      lastAvailabilitySync: now,
    }
    await this.#businessRepo?.update({ id: businessId }, searchFields)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.STATISTICS_SYNCED, { businessId, ...searchFields, identity })
    return { businessId, ...searchFields }
  }

  async refreshBusinessAvailability(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const ids = await this.#getAccommodationIds(businessId)
    let nextAvailableDate = null
    const now = new Date().toISOString().split('T')[0]
    for (const id of ids) {
      const calendar = await this.#delegate('getCalendar', id, now, now, identity)
      if (Array.isArray(calendar) && calendar.length > 0) {
        const available = calendar.find((d) => d.status === 'available')
        if (available && (!nextAvailableDate || available.date < nextAvailableDate)) {
          nextAvailableDate = available.date
        }
      }
    }
    const fields = {
      availabilityStatus: nextAvailableDate ? 'available' : 'blocked',
      nextAvailableDate,
      lastAvailabilitySync: now,
    }
    await this.#businessRepo?.update({ id: businessId }, fields)
    this.#emit(BUSINESS_AVAILABILITY_EVENTS.AVAILABILITY_REFRESHED, { businessId, ...fields, identity })
    return { businessId, ...fields }
  }

  // ── Calendar Views ──

  async getDailyCalendar(businessId, date, identity) {
    return this.getBusinessCalendar(businessId, date, date, identity)
  }

  async getWeeklyCalendar(businessId, weekStart, identity) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return this.getBusinessCalendar(
      businessId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      identity,
    )
  }

  async getMonthlyCalendar(businessId, monthStart, identity) {
    const start = new Date(monthStart)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return this.getBusinessCalendar(
      businessId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      identity,
    )
  }

  async getTimeline(businessId, startDate, endDate, identity) {
    const raw = await this.getBusinessCalendar(businessId, startDate, endDate, identity)
    const timeline = []
    for (const [accId, days] of Object.entries(raw.results || {})) {
      for (const day of days) {
        timeline.push({ accommodationId: accId, ...day })
      }
    }
    timeline.sort((a, b) => a.date.localeCompare(b.date))
    return timeline
  }

  async getOccupancyMap(businessId, startDate, endDate, identity) {
    return this.getBusinessOccupancy(businessId, startDate, endDate, identity)
  }

  async getAvailabilityMatrix(businessId, accommodationIds, startDate, endDate, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const ids = accommodationIds || await this.#getAccommodationIds(businessId)
    const matrix = {}
    for (const id of ids) {
      const calendar = await this.#delegate('getCalendar', id, startDate, endDate, identity)
      const dayMap = {}
      for (const day of calendar) dayMap[day.date] = day.status
      matrix[id] = dayMap
    }
    return { businessId, startDate, endDate, accommodationCount: ids.length, matrix }
  }

  async getAccommodationSummary(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const [calendar, occupancy] = await Promise.all([
      this.#delegate('getCalendar', accommodationId, startDate, endDate, identity),
      this.#delegate('getOccupancy', accommodationId, startDate, endDate, identity),
    ])
    return { accommodationId, startDate, endDate, calendar, occupancy }
  }

  async getBusinessSummary(businessId, startDate, endDate, identity) {
    const [availability, occupancy] = await Promise.all([
      this.getBusinessAvailability(businessId, startDate, endDate, identity),
      this.getBusinessOccupancy(businessId, startDate, endDate, identity),
    ])
    return {
      businessId, startDate, endDate,
      accommodationCount: availability.accommodationCount,
      occupancy,
    }
  }
}
