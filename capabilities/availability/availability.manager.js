import { AVAILABILITY_STATUS } from './availability.status.js'
import { AVAILABILITY_EVENTS } from './availability.events.js'
import {
  AvailabilityNotFoundError,
  AvailabilityPermissionError,
  AvailabilityConflictError,
  AvailabilityOverlapError,
} from './availability.errors.js'
import { AvailabilityWorkflow } from './availability.workflow.js'
import { validateCreateData, validateUpdateData, validateWindowData, validateRuleData, validateSeasonData, validateBlockData, validateDateRange } from './availability.validation.js'
import { AVAILABILITY_PERMISSIONS } from './availability.permissions.js'
import { AvailabilityCalendar } from './availability.calendar.js'
import { AvailabilitySearch } from './availability.search.js'

export class AvailabilityManager {
  #context

  constructor(context) {
    this.#context = context
  }

  get #repo() {
    return this.#context?.repositories?.availability || null
  }

  get #auth() {
    return this.#context?.runtime?.auth || null
  }

  get #eventBus() {
    return this.#context?.eventBus || null
  }

  async #checkPermission(identity, permission, resource) {
    if (!this.#auth) return true
    try {
      await this.#auth.authorize(identity, permission, resource || 'availability')
    } catch {
      throw new AvailabilityPermissionError(`Missing permission: ${permission}`)
    }
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  // ── Day-level CRUD ──

  async createDay(data, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE, data)
    validateCreateData(data)

    const day = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: data.status || AVAILABILITY_STATUS.AVAILABLE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const saved = await this.#repo?.create(day)
    if (!saved) return { success: false, errors: ['Failed to create availability'] }

    this.#emit(AVAILABILITY_EVENTS.CREATED, { availability: saved, identity })
    return { success: true, data: saved }
  }

  async getById(id, identity) {
    const record = await this.#repo?.findById(id)
    if (!record) throw new AvailabilityNotFoundError(id)
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ, record)
    return record
  }

  async getMany(filter, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ)
    return this.#repo?.findMany(filter) || []
  }

  async updateDay(id, data, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new AvailabilityNotFoundError(id)
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE, existing)

    const updates = validateUpdateData(data, existing.status)
    updates.updatedAt = new Date().toISOString()

    const saved = await this.#repo?.update({ id }, updates)
    if (!saved) return { success: false, errors: ['Failed to update availability'] }

    const updated = await this.#repo?.findById(id)
    this.#emit(AVAILABILITY_EVENTS.UPDATED, { availability: updated, identity, changes: updates })
    return { success: true, data: updated }
  }

  async archiveDay(id, identity) {
    return this.#transitionStatus(id, AVAILABILITY_STATUS.ARCHIVED, identity)
  }

  async restoreDay(id, identity) {
    return this.#transitionStatus(id, AVAILABILITY_STATUS.AVAILABLE, identity)
  }

  async deleteDay(id, identity) {
    return this.#transitionStatus(id, AVAILABILITY_STATUS.DELETED, identity)
  }

  // ── Block / Unblock ──

  async block(accommodationId, startDate, endDate, reason, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateDateRange(startDate, endDate)

    const dates = AvailabilityCalendar.expandRange(startDate, endDate)
    const blocked = []

    for (const date of dates) {
      const existing = await this.#repo?.findOne({ accommodationId, date })
      if (existing) {
        await this.#repo?.update({ id: existing.id }, {
          status: AVAILABILITY_STATUS.BLOCKED,
          notes: reason || '',
          updatedAt: new Date().toISOString(),
        })
        blocked.push({ ...existing, status: AVAILABILITY_STATUS.BLOCKED })
      } else {
        const day = {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          tenantId: identity?.tenantId || null,
          accommodationId,
          date,
          status: AVAILABILITY_STATUS.BLOCKED,
          notes: reason || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const saved = await this.#repo?.create(day)
        if (saved) blocked.push(saved)
      }
    }

    this.#emit(AVAILABILITY_EVENTS.BLOCKED, { accommodationId, startDate, endDate, reason, identity })
    this.#emit(AVAILABILITY_EVENTS.CALENDAR_UPDATED, { accommodationId, startDate, endDate })

    return { success: true, data: blocked }
  }

  async unblock(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateDateRange(startDate, endDate)

    const filter = { accommodationId }
    if (startDate) filter.date = { gte: startDate }
    if (endDate) filter.date = { ...filter.date, lte: endDate }

    const blocked = await this.#repo?.findMany(filter) || []
    for (const record of blocked) {
      if (record.status === AVAILABILITY_STATUS.BLOCKED || record.status === AVAILABILITY_STATUS.MAINTENANCE) {
        await this.#repo?.update({ id: record.id }, {
          status: AVAILABILITY_STATUS.AVAILABLE,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    this.#emit(AVAILABILITY_EVENTS.UNBLOCKED, { accommodationId, startDate, endDate, identity })
    this.#emit(AVAILABILITY_EVENTS.CALENDAR_UPDATED, { accommodationId, startDate, endDate })

    return { success: true, data: blocked.length }
  }

  // ── Reserve / Release ──

  async reserve(accommodationId, checkIn, checkOut, reservationId, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateDateRange(checkIn, checkOut)

    const dates = AvailabilityCalendar.expandRange(checkIn, checkOut)
    const reserved = []
    const conflicts = []

    for (const date of dates) {
      const existing = await this.#repo?.findOne({ accommodationId, date })
      if (existing) {
        if (existing.status === AVAILABILITY_STATUS.RESERVED || existing.status === AVAILABILITY_STATUS.BLOCKED) {
          conflicts.push(date)
          continue
        }
        await this.#repo?.update({ id: existing.id }, {
          status: AVAILABILITY_STATUS.RESERVED,
          notes: reservationId || '',
          updatedAt: new Date().toISOString(),
        })
        reserved.push({ ...existing, status: AVAILABILITY_STATUS.RESERVED })
      } else {
        const day = {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          tenantId: identity?.tenantId || null,
          accommodationId,
          date,
          status: AVAILABILITY_STATUS.RESERVED,
          notes: reservationId || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const saved = await this.#repo?.create(day)
        if (saved) reserved.push(saved)
      }
    }

    if (conflicts.length > 0) {
      return { success: false, errors: [`Dates already blocked or reserved: ${conflicts.join(', ')}`], conflicts }
    }

    this.#emit(AVAILABILITY_EVENTS.RESERVED, { accommodationId, checkIn, checkOut, reservationId, identity })
    this.#emit(AVAILABILITY_EVENTS.CALENDAR_UPDATED, { accommodationId, startDate: checkIn, endDate: checkOut })

    return { success: true, data: reserved }
  }

  async release(accommodationId, checkIn, checkOut, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)

    const filter = { accommodationId, status: AVAILABILITY_STATUS.RESERVED }
    if (checkIn) filter.date = { gte: checkIn }
    if (checkOut) filter.date = { ...filter.date, lte: checkOut }

    const reserved = await this.#repo?.findMany(filter) || []
    for (const record of reserved) {
      await this.#repo?.update({ id: record.id }, {
        status: AVAILABILITY_STATUS.AVAILABLE,
        notes: '',
        updatedAt: new Date().toISOString(),
      })
    }

    this.#emit(AVAILABILITY_EVENTS.RELEASED, { accommodationId, checkIn, checkOut, identity })
    this.#emit(AVAILABILITY_EVENTS.CALENDAR_UPDATED, { accommodationId, startDate: checkIn, endDate: checkOut })

    return { success: true, data: reserved.length }
  }

  // ── Calendar Queries ──

  async getCalendar(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ)
    validateDateRange(startDate, endDate)

    const allDates = AvailabilityCalendar.expandRange(startDate, endDate)
    const records = await this.#repo?.findMany({ accommodationId, date: { gte: startDate, lte: endDate } }) || []
    const recordMap = {}
    for (const r of records) recordMap[r.date] = r

    return allDates.map((d) => ({
      date: d,
      status: recordMap[d]?.status || 'available',
      capacity: recordMap[d]?.capacity || null,
      available: recordMap[d]?.available || null,
      price: recordMap[d]?.price || null,
      notes: recordMap[d]?.notes || null,
    }))
  }

  async checkAvailability(accommodationId, checkIn, checkOut, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ)
    validateDateRange(checkIn, checkOut)

    const endDate = new Date(checkOut)
    endDate.setDate(endDate.getDate() - 1)
    const dates = AvailabilityCalendar.expandRange(checkIn, endDate.toISOString().split('T')[0])

    const records = await this.#repo?.findMany({ accommodationId, date: { gte: checkIn, lte: checkOut } }) || []
    const recordMap = {}
    for (const r of records) recordMap[r.date] = r

    const results = dates.map((d) => {
      const record = recordMap[d]
      const status = record?.status || 'available'
      return { date: d, available: status === 'available', status }
    })

    const blockedDates = results.filter((r) => !r.available)
    return {
      available: blockedDates.length === 0,
      checkIn,
      checkOut,
      totalNights: dates.length,
      blockedDates: blockedDates.map((r) => r.date),
      details: results,
    }
  }

  async getOccupancy(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ)
    const calendar = await this.getCalendar(accommodationId, startDate, endDate, identity)
    const total = calendar.length
    const blocked = calendar.filter((d) => d.status !== 'available').length
    return {
      total,
      available: total - blocked,
      blocked,
      occupancyPercent: total > 0 ? Math.round((blocked / total) * 100) : 0,
    }
  }

  async getCalendarSummary(accommodationId, startDate, endDate, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.READ)
    const calendar = await this.getCalendar(accommodationId, startDate, endDate, identity)
    return AvailabilitySearch.toCalendarPayload(accommodationId, calendar)
  }

  // ── Windows ──

  async createWindow(data, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateWindowData(data)

    const existing = await this.#repo?.findMany({
      accommodationId: data.accommodationId,
      date: { gte: data.startDate, lte: data.endDate },
    })

    const window = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const saved = await this.#repo?.create(window)
    if (!saved) return { success: false, errors: ['Failed to create window'] }

    this.#emit(AVAILABILITY_EVENTS.CALENDAR_UPDATED, { accommodationId: data.accommodationId, startDate: data.startDate, endDate: data.endDate })
    return { success: true, data: saved }
  }

  // ── Rules ──

  async createRule(data, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateRuleData(data)

    const rule = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      active: data.active !== false,
      priority: data.priority || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const saved = await this.#repo?.create(rule)
    if (!saved) return { success: false, errors: ['Failed to create rule'] }

    this.#emit(AVAILABILITY_EVENTS.RULE_CREATED, { rule: saved, identity })
    return { success: true, data: saved }
  }

  async updateRule(id, data, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new AvailabilityNotFoundError(id)
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE, existing)

    const updates = { ...data, updatedAt: new Date().toISOString() }
    const saved = await this.#repo?.update({ id }, updates)
    if (!saved) return { success: false, errors: ['Failed to update rule'] }

    const updated = await this.#repo?.findById(id)
    this.#emit(AVAILABILITY_EVENTS.RULE_UPDATED, { rule: updated, identity })
    return { success: true, data: updated }
  }

  async deleteRule(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new AvailabilityNotFoundError(id)
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.ARCHIVE, existing)
    await this.#repo?.update({ id }, { status: AVAILABILITY_STATUS.DELETED, updatedAt: new Date().toISOString() })
    this.#emit(AVAILABILITY_EVENTS.RULE_DELETED, { ruleId: id, identity })
    return { success: true }
  }

  // ── Seasons ──

  async createSeason(data, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateSeasonData(data)

    const season = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const saved = await this.#repo?.create(season)
    if (!saved) return { success: false, errors: ['Failed to create season'] }
    return { success: true, data: saved }
  }

  // ── Blocks (manual) ──

  async createBlock(data, identity) {
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE)
    validateBlockData(data)

    const block = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const saved = await this.#repo?.create(block)
    if (!saved) return { success: false, errors: ['Failed to create block'] }
    await this.block(data.accommodationId, data.startDate, data.endDate, data.reason, identity)
    return { success: true, data: saved }
  }

  // ── Status Transition ──

  async #transitionStatus(id, newStatus, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new AvailabilityNotFoundError(id)
    await this.#checkPermission(identity, AVAILABILITY_PERMISSIONS.WRITE, existing)
    AvailabilityWorkflow.transition(existing, newStatus)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: newStatus, updatedAt: now })

    const eventMap = {
      [AVAILABILITY_STATUS.ARCHIVED]: AVAILABILITY_EVENTS.ARCHIVED,
      [AVAILABILITY_STATUS.DELETED]: AVAILABILITY_EVENTS.DELETED,
    }

    this.#emit(eventMap[newStatus] || AVAILABILITY_EVENTS.UPDATED, {
      availability: { ...existing, status: newStatus },
      identity,
    })

    this.#emit(AVAILABILITY_EVENTS.CALENDAR_UPDATED, { accommodationId: existing.accommodationId })
    return { success: true, data: { ...existing, status: newStatus, updatedAt: now } }
  }
}
