import { BUSINESS_RESERVATION_EVENTS } from '../business.events.js'
import { BusinessOrchestrationError } from '../business.errors.js'
import { BUSINESS_PERMISSIONS } from '../business.permissions.js'
import { BUSINESS_STATUS } from '../business.status.js'
import { isArchivableStatus } from '../../reservation/reservation.status.js'

export class BusinessReservationManager {
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

  get #reservation() {
    return this.#context?.capabilities?.get?.('reservation')
  }

  get #reservationRepo() {
    return this.#context?.repositories?.reservation || null
  }

  get #accommodationRepo() {
    return this.#context?.repositories?.accommodation || null
  }

  get #businessRepo() {
    return this.#context?.repositories?.business || null
  }

  get #availabilityManager() {
    return this.#context?.capabilities?.get?.('business')?.manager?.getAvailabilityManager?.()
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
      throw new BusinessOrchestrationError('Archived businesses cannot manage reservations')
    }
    if (business.status === BUSINESS_STATUS.DELETED) {
      throw new BusinessOrchestrationError('Deleted businesses cannot manage reservations')
    }
    return business
  }

  async #assertAccommodationBelongsToBusiness(accommodationId, businessId) {
    const accommodation = await this.#accommodationRepo?.findById(accommodationId)
    if (!accommodation) throw new BusinessOrchestrationError(`Accommodation not found: ${accommodationId}`)
    if (accommodation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Accommodation does not belong to this business')
    }
    return accommodation
  }

  async #assertReservationBelongsToBusiness(reservationId, businessId) {
    const cap = this.#reservation
    if (!cap?.service) throw new BusinessOrchestrationError('Reservation capability not available')
    const reservation = await cap.service.findReservation(reservationId, null)
    if (!reservation) throw new BusinessOrchestrationError(`Reservation not found: ${reservationId}`)
    if (reservation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Reservation does not belong to this business')
    }
    return reservation
  }

  async #getAccommodationIds(businessId) {
    const accommodations = await this.#accommodationRepo?.findMany({ businessId }) || []
    return accommodations.map((a) => a.id)
  }

  #delegateService(method, ...args) {
    const cap = this.#reservation
    if (!cap?.service) throw new BusinessOrchestrationError('Reservation capability not available')
    const fn = cap.service[method]
    if (!fn) throw new BusinessOrchestrationError(`Reservation service method not found: ${method}`)
    return fn.call(cap.service, ...args)
  }

  #delegateManager(method, ...args) {
    const cap = this.#reservation
    if (!cap?.manager) throw new BusinessOrchestrationError('Reservation capability not available')
    const fn = cap.manager[method]
    if (!fn) throw new BusinessOrchestrationError(`Reservation manager method not found: ${method}`)
    return fn.call(cap.manager, ...args)
  }

  getReservationCapability() {
    return this.#reservation
  }

  // ── Reservation Lifecycle ──

  async createReservation(businessId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    if (data.accommodationId) {
      await this.#assertAccommodationBelongsToBusiness(data.accommodationId, businessId)
    }
    const result = await this.#delegateService('createReservation', { ...data, businessId }, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_CREATED, { businessId, reservationId: result.reservationId, data: result.data || result, identity })
    }
    return result
  }

  async updateReservation(businessId, reservationId, data, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('updateReservation', reservationId, data, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_UPDATED, { businessId, reservationId, changes: data, identity })
    }
    return result
  }

  async confirmReservation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('confirmReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_CONFIRMED, { businessId, reservationId, identity })
    }
    return result
  }

  async rejectReservation(businessId, reservationId, reason, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('rejectReservation', reservationId, reason, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_REJECTED, { businessId, reservationId, reason, identity })
    }
    return result
  }

  async cancelReservation(businessId, reservationId, reason, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const reservation = await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('cancelReservation', reservationId, reason, identity)
    if (result?.success && reservation?.accommodationId) {
      try {
        const availabilityManager = this.#availabilityManager
        if (availabilityManager?.releaseReservation) {
          await availabilityManager.releaseReservation(reservation.accommodationId, reservation.dates?.checkIn, reservation.dates?.checkOut, identity)
        }
      } catch { }
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_CANCELLED, { businessId, reservationId, reason, identity })
    }
    return result
  }

  async expireReservation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const reservation = await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('expireReservation', reservationId, identity)
    if (result?.success && reservation?.accommodationId) {
      try {
        const availabilityManager = this.#availabilityManager
        if (availabilityManager?.releaseReservation) {
          await availabilityManager.releaseReservation(reservation.accommodationId, reservation.dates?.checkIn, reservation.dates?.checkOut, identity)
        }
      } catch { }
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED, { businessId, reservationId, identity })
    }
    return result
  }

  async checkIn(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateManager('checkInReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_CHECKED_IN, { businessId, reservationId, identity })
    }
    return result
  }

  async checkOut(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateManager('checkOutReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_CHECKED_OUT, { businessId, reservationId, identity })
    }
    return result
  }

  async noShow(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateManager('noShowReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED, { businessId, reservationId, identity })
    }
    return result
  }

  async archiveReservation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('archiveReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_ARCHIVED, { businessId, reservationId, identity })
    }
    return result
  }

  async restoreReservation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('restoreReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_RESTORED, { businessId, reservationId, identity })
    }
    return result
  }

  async deleteReservation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    const result = await this.#delegateService('deleteReservation', reservationId, identity)
    if (result?.success) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_DELETED, { businessId, reservationId, identity })
    }
    return result
  }

  async completeReservation(businessId, reservationId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    await this.#assertReservationBelongsToBusiness(reservationId, businessId)
    return this.#delegateService('completeReservation', reservationId, identity)
  }

  // ── Reservation Queries ──

  async getReservation(businessId, reservationId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const reservation = await this.#delegateService('findReservation', reservationId, identity)
    if (!reservation) return null
    if (reservation.businessId !== businessId) {
      throw new BusinessOrchestrationError('Reservation does not belong to this business')
    }
    return reservation
  }

  async getReservationById(businessId, reservationId, identity) {
    return this.getReservation(businessId, reservationId, identity)
  }

  async getReservationByCode(businessId, code, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.find((r) => r.code === code || r.id === code) || null
  }

  async getReservations(businessId, filter, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('findReservations', { ...filter, businessId }, identity)
  }

  async findByVisitor(businessId, visitorId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const reservations = await this.#delegateService('findByVisitor', visitorId, identity) || []
    return reservations.filter((r) => r.businessId === businessId)
  }

  async findByAccommodation(businessId, accommodationId, identity) {
    await this.#assertAccommodationBelongsToBusiness(accommodationId, businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('findByAccommodation', accommodationId, identity)
  }

  async findByBusiness(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('findByBusiness', businessId, identity)
  }

  async findPending(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) =>
      r.status === 'requested' || r.status === 'owner_pending' || r.status === 'owner_confirmed' || r.status === 'payment_pending'
    )
  }

  async findConfirmed(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'confirmed')
  }

  async findCheckedIn(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'checked_in')
  }

  async findCheckedOut(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'checked_out')
  }

  async findCompleted(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'completed')
  }

  async findCancelled(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired')
  }

  async findArchived(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'archived')
  }

  async findActive(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) =>
      r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'rejected' &&
      r.status !== 'expired' && r.status !== 'no_show' && r.status !== 'no_response' && r.status !== 'archived'
    )
  }

  // ── Business Aggregation ──

  async getBusinessReservations(businessId, identity) {
    return this.findByBusiness(businessId, identity)
  }

  async getUpcomingReservations(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    const now = new Date().toISOString().split('T')[0]
    return reservations.filter((r) =>
      (r.status === 'confirmed' || r.status === 'checked_in') &&
      r.dates?.checkIn >= now
    ).sort((a, b) => (a.dates?.checkIn || '').localeCompare(b.dates?.checkIn || ''))
  }

  async getTodayArrivals(businessId, identity) {
    const today = new Date().toISOString().split('T')[0]
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) =>
      (r.status === 'confirmed' || r.status === 'checked_in') &&
      r.dates?.checkIn === today
    )
  }

  async getTodayDepartures(businessId, identity) {
    const today = new Date().toISOString().split('T')[0]
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) =>
      (r.status === 'checked_in' || r.status === 'checked_out') &&
      r.dates?.checkOut === today
    )
  }

  async getCurrentGuests(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    return reservations.filter((r) => r.status === 'checked_in')
  }

  async getReservationTimeline(businessId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const reservations = await this.findByBusiness(businessId, identity)
    const filtered = reservations.filter((r) => {
      if (!r.dates) return false
      const checkIn = r.dates.checkIn
      const checkOut = r.dates.checkOut
      return checkIn && checkOut && checkIn <= endDate && checkOut >= startDate
    })
    filtered.sort((a, b) => (a.dates?.checkIn || '').localeCompare(b.dates?.checkIn || ''))
    return filtered
  }

  async getReservationDashboard(businessId, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const active = reservations.filter((r) =>
      r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'rejected' &&
      r.status !== 'expired' && r.status !== 'no_show' && r.status !== 'archived'
    )
    const confirmed = reservations.filter((r) => r.status === 'confirmed')
    const checkedIn = reservations.filter((r) => r.status === 'checked_in')
    const pending = reservations.filter((r) =>
      r.status === 'requested' || r.status === 'owner_pending'
    )
    const completed = reservations.filter((r) => r.status === 'completed')
    const cancelled = reservations.filter((r) =>
      r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired'
    )

    const monthReservations = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn >= monthStart && r.dates.checkIn <= monthEnd
    })

    const todayArrivals = reservations.filter((r) =>
      (r.status === 'confirmed' || r.status === 'checked_in') &&
      r.dates?.checkIn === today
    )
    const todayDepartures = reservations.filter((r) =>
      (r.status === 'checked_in' || r.status === 'checked_out') &&
      r.dates?.checkOut === today
    )

    const totalRevenue = completed.reduce((sum, r) => sum + (r.totalPrice || 0), 0)
    const monthRevenue = monthReservations.reduce((sum, r) => sum + (r.totalPrice || 0), 0)

    this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_DASHBOARD_UPDATED, { businessId, identity })
    return {
      businessId,
      total: reservations.length,
      active: active.length,
      confirmed: confirmed.length,
      checkedIn: checkedIn.length,
      pending: pending.length,
      completed: completed.length,
      cancelled: cancelled.length,
      monthReservations: monthReservations.length,
      todayArrivals: todayArrivals.length,
      todayDepartures: todayDepartures.length,
      totalRevenue,
      monthRevenue,
    }
  }

  // ── Analytics ──

  async calculateOccupancy(businessId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const accommodationIds = await this.#getAccommodationIds(businessId)
    const reservations = await this.findByBusiness(businessId, identity)
    const activeReservations = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn <= endDate && r.dates.checkOut >= startDate &&
        (r.status === 'confirmed' || r.status === 'checked_in' || r.status === 'checked_out')
    })
    const totalUnits = accommodationIds.length
    const occupiedUnits = new Set(activeReservations.map((r) => r.accommodationId)).size
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
    return {
      businessId, startDate, endDate,
      totalUnits,
      occupiedUnits,
      availableUnits: totalUnits - occupiedUnits,
      occupancyRate,
      activeReservations: activeReservations.length,
    }
  }

  async calculateRevenue(businessId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const reservations = await this.findByBusiness(businessId, identity)
    const filtered = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn >= startDate && r.dates.checkIn <= endDate &&
        (r.status === 'completed' || r.status === 'checked_out' || r.status === 'checked_in' || r.status === 'confirmed')
    })
    const totalRevenue = filtered.reduce((sum, r) => sum + (r.totalPrice || 0), 0)
    const averagePrice = filtered.length > 0 ? Math.round((totalRevenue / filtered.length) * 100) / 100 : 0
    this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_REVENUE_UPDATED, { businessId, startDate, endDate, totalRevenue, identity })
    return {
      businessId, startDate, endDate,
      totalReservations: filtered.length,
      totalRevenue,
      averagePrice,
    }
  }

  async calculateADR(businessId, startDate, endDate, identity) {
    const revenueResult = await this.calculateRevenue(businessId, startDate, endDate, identity)
    const accommodationIds = await this.#getAccommodationIds(businessId)
    const totalRoomNights = accommodationIds.length * this.#calculateDateRangeNights(startDate, endDate)
    const adr = totalRoomNights > 0 ? Math.round((revenueResult.totalRevenue / totalRoomNights) * 100) / 100 : 0
    return {
      businessId, startDate, endDate,
      adr,
      totalRevenue: revenueResult.totalRevenue,
      totalRoomNights,
    }
  }

  async calculateRevPAR(businessId, startDate, endDate, identity) {
    const accommodationIds = await this.#getAccommodationIds(businessId)
    const totalUnits = accommodationIds.length
    const revenueResult = await this.calculateRevenue(businessId, startDate, endDate, identity)
    const totalNights = this.#calculateDateRangeNights(startDate, endDate)
    const availableRoomNights = totalUnits * totalNights
    const revpar = availableRoomNights > 0 ? Math.round((revenueResult.totalRevenue / availableRoomNights) * 100) / 100 : 0
    return {
      businessId, startDate, endDate,
      revpar,
      totalRevenue: revenueResult.totalRevenue,
      availableRoomNights,
      totalUnits,
    }
  }

  async calculateAverageStay(businessId, startDate, endDate, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    const reservations = await this.findByBusiness(businessId, identity)
    const filtered = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn >= startDate && r.dates.checkIn <= endDate
    })
    let totalNights = 0
    for (const r of filtered) {
      totalNights += this.#calculateNights(r.dates.checkIn, r.dates.checkOut)
    }
    const averageStay = filtered.length > 0 ? Math.round((totalNights / filtered.length) * 10) / 10 : 0
    return {
      businessId, startDate, endDate,
      averageStay,
      totalReservations: filtered.length,
      totalNights,
    }
  }

  async calculateCancellationRate(businessId, startDate, endDate, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    const filtered = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn >= startDate && r.dates.checkIn <= endDate
    })
    const cancelled = filtered.filter((r) => r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired')
    const rate = filtered.length > 0 ? Math.round((cancelled.length / filtered.length) * 100) : 0
    return {
      businessId, startDate, endDate,
      cancellationRate: rate,
      totalReservations: filtered.length,
      cancelled: cancelled.length,
    }
  }

  async calculateNoShowRate(businessId, startDate, endDate, identity) {
    const reservations = await this.findByBusiness(businessId, identity)
    const filtered = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn >= startDate && r.dates.checkIn <= endDate
    })
    const noShows = filtered.filter((r) => r.status === 'no_show')
    const rate = filtered.length > 0 ? Math.round((noShows.length / filtered.length) * 100) : 0
    return {
      businessId, startDate, endDate,
      noShowRate: rate,
      totalReservations: filtered.length,
      noShows: noShows.length,
    }
  }

  async refreshReservationStatistics(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const reservations = await this.findByBusiness(businessId, identity)
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const total = reservations.length
    const active = reservations.filter((r) =>
      r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'rejected' &&
      r.status !== 'expired' && r.status !== 'no_show' && r.status !== 'archived'
    ).length
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length
    const checkedIn = reservations.filter((r) => r.status === 'checked_in').length
    const completed = reservations.filter((r) => r.status === 'completed').length
    const cancelled = reservations.filter((r) =>
      r.status === 'cancelled' || r.status === 'rejected' || r.status === 'expired'
    ).length
    const completedRevenue = reservations.filter((r) => r.status === 'completed').reduce((sum, r) => sum + (r.totalPrice || 0), 0)
    const monthRevenue = reservations.filter((r) => {
      if (!r.dates) return false
      return r.dates.checkIn >= monthStart && r.dates.checkIn <= monthEnd
    }).reduce((sum, r) => sum + (r.totalPrice || 0), 0)

    const accommodationIds = await this.#getAccommodationIds(businessId)
    const confirmedOrInHouse = reservations.filter((r) => r.status === 'confirmed' || r.status === 'checked_in')
    const occupiedUnits = new Set(confirmedOrInHouse.map((r) => r.accommodationId)).size
    const occupancyRate = accommodationIds.length > 0 ? Math.round((occupiedUnits / accommodationIds.length) * 100) : 0

    const fields = {
      reservationCount: total,
      activeReservations: active,
      pendingReservations: reservations.filter((r) =>
        r.status === 'requested' || r.status === 'owner_pending'
      ).length,
      confirmedReservations: confirmed,
      checkedInCount: checkedIn,
      completedCount: completed,
      cancelledCount: cancelled,
      occupancyRate,
      totalRevenue: completedRevenue,
      monthRevenue,
      lastReservationSync: today,
    }
    await this.#businessRepo?.update({ id: businessId }, fields)
    this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_STATISTICS_UPDATED, { businessId, ...fields, identity })
    return { businessId, ...fields }
  }

  // ── Batch Operations ──

  async bulkCancel(businessId, reservationIds, reason, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of reservationIds) {
      try {
        await this.cancelReservation(businessId, id, reason, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ reservationId: id, error: err.message })
      }
    }
    return results
  }

  async bulkArchive(businessId, reservationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of reservationIds) {
      try {
        await this.archiveReservation(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ reservationId: id, error: err.message })
      }
    }
    return results
  }

  async bulkRestore(businessId, reservationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of reservationIds) {
      try {
        await this.restoreReservation(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ reservationId: id, error: err.message })
      }
    }
    return results
  }

  async bulkConfirm(businessId, reservationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of reservationIds) {
      try {
        await this.confirmReservation(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ reservationId: id, error: err.message })
      }
    }
    return results
  }

  async bulkDelete(businessId, reservationIds, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE)
    const results = { succeeded: 0, failed: 0, errors: [] }
    for (const id of reservationIds) {
      try {
        await this.deleteReservation(businessId, id, identity)
        results.succeeded++
      } catch (err) {
        results.failed++
        results.errors.push({ reservationId: id, error: err.message })
      }
    }
    return results
  }

  // ── Synchronization ──

  async syncReservationStatistics(businessId, identity) {
    return this.refreshReservationStatistics(businessId, identity)
  }

  async refreshBusinessReservations(businessId, identity) {
    await this.#assertBusinessActive(businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const reservations = await this.findByBusiness(businessId, identity)
    const now = new Date().toISOString()
    const fields = { reservationCount: reservations.length, lastReservationSync: now }
    await this.#businessRepo?.update({ id: businessId }, fields)
    return { businessId, ...fields }
  }

  async refreshReservationSearch(businessId, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE)
    const search = this.#context?.runtime?.search
    if (!search) return { businessId, indexed: 0 }
    const reservations = await this.findByBusiness(businessId, identity)
    let indexed = 0
    for (const r of reservations) {
      try {
        await search.index('reservation', { ...r, businessId })
        indexed++
      } catch { }
    }
    return { businessId, indexed, total: reservations.length }
  }

  // ── Price & Availability Coordination ──

  async calculateReservationPrice(businessId, accommodationId, checkIn, checkOut, guests, identity) {
    await this.#assertAccommodationBelongsToBusiness(accommodationId, businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('calculateReservationPrice', accommodationId, checkIn, checkOut, guests, identity)
  }

  async validateAvailability(businessId, accommodationId, checkIn, checkOut, identity) {
    await this.#assertAccommodationBelongsToBusiness(accommodationId, businessId)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('validateAvailability', accommodationId, checkIn, checkOut, identity)
  }

  async estimateTaxes(businessId, totalPrice, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('estimateTaxes', totalPrice, identity)
  }

  async estimateCommission(businessId, totalPrice, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#delegateService('estimateCommission', totalPrice, identity)
  }

  // ── Business Rules: Cascade ──

  async cascadeArchive(businessId, identity) {
    try {
      const reservations = await this.findByBusiness(businessId, identity)
      for (const r of reservations) {
        if (r.status === 'requested' || r.status === 'owner_pending' || r.status === 'owner_confirmed' || r.status === 'payment_pending') {
          await this.#delegateService('cancelReservation', r.id, 'Business archived', identity)
        } else if (r.status === 'confirmed' || r.status === 'checked_in' || r.status === 'checked_out' || r.status === 'completed') {
          await this.#delegateService('archiveReservation', r.id, identity)
          await this.#delegateService('updateReservation', r.id, { archivedByBusiness: true }, identity)
        }
      }
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_ARCHIVED, { businessId, action: 'cascade_archive', identity })
    } catch (err) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_ERROR, { businessId, action: 'cascade_archive', error: err.message })
    }
  }

  async cascadeRestore(businessId, identity) {
    try {
      const reservations = await this.findByBusiness(businessId, identity)
      for (const r of reservations) {
        if (r.status === 'archived' && r.archivedByBusiness) {
          await this.#delegateService('restoreReservation', r.id, identity)
        }
      }
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_RESTORED, { businessId, action: 'cascade_restore', identity })
    } catch (err) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_ERROR, { businessId, action: 'cascade_restore', error: err.message })
    }
  }

  async cascadeDelete(businessId, identity) {
    try {
      const reservations = await this.findByBusiness(businessId, null)
      for (const r of reservations) {
        if (!isArchivableStatus(r.status)) continue
        await this.#delegateService('archiveReservation', r.id, null)
      }
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_ARCHIVED, { businessId, action: 'cascade_delete', identity })
    } catch (err) {
      this.#emit(BUSINESS_RESERVATION_EVENTS.RESERVATION_ERROR, { businessId, action: 'cascade_delete', error: err.message })
    }
  }

  // ── Utility ──

  #calculateDateRangeNights(startDate, endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
    return Math.max(0, Math.floor((end - start) / 86400000)) + 1
  }

  #calculateNights(checkIn, checkOut) {
    const inDate = new Date(checkIn)
    const outDate = new Date(checkOut)
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return 0
    return Math.max(0, Math.floor((outDate - inDate) / 86400000))
  }
}
