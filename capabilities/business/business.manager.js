import { BUSINESS_STATUS } from './business.status.js'
import { BUSINESS_EVENTS } from './business.events.js'
import {
  BusinessNotFoundError,
  BusinessPermissionError,
  BusinessConflictError,
} from './business.errors.js'
import { BusinessWorkflow } from './business.workflow.js'
import { validateCreateData, validateUpdateData, validateSlug, validateBusinessRules } from './business.validation.js'
import { BUSINESS_PERMISSIONS } from './business.permissions.js'
import { BusinessSeo } from './business.seo.js'
import { BusinessMedia } from './business.media.js'
import { BusinessAccommodationManager } from './manager/business-accommodation.manager.js'
import { BusinessBrandManager } from './manager/business-brand.manager.js'
import { BusinessOwnerManager } from './manager/business-owner.manager.js'
import { BusinessSearchManager } from './manager/business-search.manager.js'
import { BusinessStatisticsManager } from './manager/business-statistics.manager.js'
import { BusinessCmsManager } from './manager/business-cms.manager.js'
import { BusinessAvailabilityManager } from './manager/business-availability.manager.js'
import { BusinessReservationManager } from './manager/business-reservation.manager.js'
import { BusinessVisitorManager } from './manager/business-visitor.manager.js'
import { BusinessPaymentManager } from './manager/business-payment.manager.js'
import { BusinessNotificationManager } from './manager/business-notification.manager.js'

export class BusinessManager {
  #context
  #accommodation
  #brand
  #owner
  #search
  #statistics
  #cms
  #availability
  #reservation
  #visitor
  #payment
  #notification

  constructor(context) {
    this.#context = context
    this.#accommodation = new BusinessAccommodationManager(context)
    this.#brand = new BusinessBrandManager(context)
    this.#owner = new BusinessOwnerManager(context)
    this.#search = new BusinessSearchManager(context)
    this.#statistics = new BusinessStatisticsManager(context)
    this.#cms = new BusinessCmsManager(context)
    this.#availability = new BusinessAvailabilityManager(context)
    this.#reservation = new BusinessReservationManager(context)
    this.#visitor = new BusinessVisitorManager(context)
    this.#payment = new BusinessPaymentManager(context)
    this.#notification = new BusinessNotificationManager(context)
  }

  get #repo() {
    return this.#context?.repositories?.business || null
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
      await this.#auth.authorize(identity, permission, resource || 'business')
    } catch {
      throw new BusinessPermissionError(`Missing permission: ${permission}`)
    }
  }

  #emit(event, data) {
    this.#eventBus?.emit(event, data)
  }

  #generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100)
  }

  async #ensureUniqueSlug(slug, tenantId, excludeId) {
    if (!this.#repo) return slug
    const filter = { tenantId, slug }
    if (excludeId) filter.id = { ne: excludeId }
    const existing = await this.#repo.findOne(filter)
    if (existing) throw new BusinessConflictError(`Slug already exists: ${slug}`)
    return slug
  }

  async #transitionStatus(id, newStatus, identity, permission) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, permission, existing)
    BusinessWorkflow.transition(existing, newStatus)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: newStatus, updatedAt: now })

    const eventMap = {
      [BUSINESS_STATUS.PUBLISHED]: BUSINESS_EVENTS.PUBLISHED,
      [BUSINESS_STATUS.SUSPENDED]: BUSINESS_EVENTS.UNPUBLISHED,
      [BUSINESS_STATUS.ARCHIVED]: BUSINESS_EVENTS.ARCHIVED,
    }
    this.#emit(eventMap[newStatus] || BUSINESS_EVENTS.UPDATED, {
      business: { ...existing, status: newStatus },
      identity,
    })
    return { success: true, data: { ...existing, status: newStatus, updatedAt: now } }
  }

  // ── Business CRUD ──

  async createBusiness(data, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.CREATE, data)
    validateCreateData(data)
    const businessErrors = validateBusinessRules(data)
    if (businessErrors.length > 0) throw new BusinessConflictError('Business rules validation failed')

    const now = new Date().toISOString()
    const slug = data.slug || this.#generateSlug(data.name)
    await this.#ensureUniqueSlug(slug, data.tenantId)

    const business = {
      ...data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      slug, status: BUSINESS_STATUS.DRAFT,
      socialNetworks: data.socialNetworks || {},
      coordinates: data.coordinates || {},
      metadata: data.metadata || {},
      seo: data.seo || {},
      publishedAccommodationCount: 0,
      draftAccommodationCount: 0,
      accommodationCategories: [],
      rating: null,
      createdAt: now, updatedAt: now,
    }

    const saved = await this.#repo?.create(business)
    if (!saved) return { success: false, errors: ['Failed to save business'] }
    this.#emit(BUSINESS_EVENTS.CREATED, { business: saved, identity })
    return { success: true, data: saved }
  }

  async getById(id, identity) {
    const business = await this.#repo?.findById(id)
    if (!business) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ, business)
    return business
  }

  async getMany(filter, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#repo?.findMany(filter) || []
  }

  async updateBusiness(id, data, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.UPDATE, existing)
    const updates = validateUpdateData(data, existing.status)
    if (data.slug) {
      validateSlug(data.slug)
      await this.#ensureUniqueSlug(data.slug, existing.tenantId, id)
      updates.slug = data.slug
    }
    if (data.coordinates) updates.coordinates = data.coordinates
    if (data.socialNetworks) updates.socialNetworks = data.socialNetworks
    updates.updatedAt = new Date().toISOString()
    const saved = await this.#repo?.update({ id }, updates)
    if (!saved) return { success: false, errors: ['Failed to update business'] }
    const updated = await this.#repo?.findById(id)
    this.#emit(BUSINESS_EVENTS.UPDATED, { business: updated, identity, changes: updates })
    return { success: true, data: updated }
  }

  async publishBusiness(id, identity) {
    return this.#transitionStatus(id, BUSINESS_STATUS.PUBLISHED, identity, BUSINESS_PERMISSIONS.PUBLISH)
  }

  async suspendBusiness(id, identity) {
    return this.#transitionStatus(id, BUSINESS_STATUS.SUSPENDED, identity, BUSINESS_PERMISSIONS.PUBLISH)
  }

  getAvailabilityManager() {
    return this.#availability
  }

  getReservationManager() {
    return this.#reservation
  }

  getVisitorManager() {
    return this.#visitor
  }

  getPaymentManager() {
    return this.#payment
  }

  getNotificationManager() {
    return this.#notification
  }

  async archiveBusiness(id, identity) {
    const result = await this.#transitionStatus(id, BUSINESS_STATUS.ARCHIVED, identity, BUSINESS_PERMISSIONS.ARCHIVE)
    await this.#accommodation.cascadeArchive(id, identity)
    await this.#reservation.cascadeArchive(id, identity)
    await this.#visitor.cascadeArchive(id, identity)
    await this.#payment.cascadeArchive(id, identity)
    await this.#notification.cascadeArchive(id, identity)
    return result
  }

  async restoreBusiness(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.ARCHIVE, existing)
    const targetStatus = BUSINESS_STATUS.DRAFT
    BusinessWorkflow.transition(existing, targetStatus)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: targetStatus, updatedAt: now })
    await this.#accommodation.cascadeRestore(id, identity)
    await this.#reservation.cascadeRestore(id, identity)
    await this.#visitor.cascadeRestore(id, identity)
    await this.#payment.cascadeRestore(id, identity)
    await this.#notification.cascadeRestore(id, identity)
    this.#emit(BUSINESS_EVENTS.RESTORED, { business: { ...existing, status: targetStatus }, identity })
    return { success: true, data: { ...existing, status: targetStatus, updatedAt: now } }
  }

  async deleteBusiness(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.DELETE, existing)
    BusinessWorkflow.transition(existing, BUSINESS_STATUS.DELETED)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { status: BUSINESS_STATUS.DELETED, updatedAt: now })
    await this.#accommodation.cascadeArchive(id, identity)
    await this.#reservation.cascadeDelete(id, identity)
    await this.#visitor.cascadeDelete(id, identity)
    await this.#payment.cascadeDelete(id, identity)
    await this.#notification.cascadeDelete(id, identity)
    this.#emit(BUSINESS_EVENTS.DELETED, { business: { ...existing, status: BUSINESS_STATUS.DELETED }, identity })
    return { success: true }
  }

  async verifyBusiness(id, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.VERIFY, existing)
    const now = new Date().toISOString()
    await this.#repo?.update({ id }, { verificationStatus: 'verified', updatedAt: now })
    this.#emit(BUSINESS_EVENTS.VERIFIED, { business: { ...existing, verificationStatus: 'verified' }, identity })
    return { success: true, data: { ...existing, verificationStatus: 'verified', updatedAt: now } }
  }

  async transferBusinessOwner(id, newOwnerId, identity) {
    const existing = await this.#repo?.findById(id)
    if (!existing) throw new BusinessNotFoundError(id)
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.TRANSFER, existing)
    await this.#owner.transferOwner(id, newOwnerId, identity)
    const updated = await this.#repo?.findById(id)
    this.#emit(BUSINESS_EVENTS.OWNER_CHANGED, { business: updated, identity })
    return { success: true, data: updated }
  }

  async findBySlug(slug, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#repo?.findOne({ slug }) || null
  }

  async findByTenant(tenantId, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#repo?.findMany({ tenantId, ...options }) || []
  }

  async findByDestination(destinationId, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#repo?.findMany({ destinationId, ...options }) || []
  }

  async getByStatus(status, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#repo?.findMany({ status, ...options }) || []
  }

  async getByCategory(category, options, identity) {
    await this.#checkPermission(identity, BUSINESS_PERMISSIONS.READ)
    return this.#repo?.findMany({ category, ...options }) || []
  }

  async searchBusinesses(query, options, identity) {
    return this.#search.search(query, options, identity)
  }

  async getSEO(id, identity) {
    const business = await this.getById(id, identity)
    return BusinessSeo.generate(business)
  }

  async getMedia(id, identity) {
    const business = await this.getById(id, identity)
    return BusinessMedia.create(business.media || [])
  }

  // ── Accommodation Delegation ──

  async createAccommodation(businessId, data, identity) {
    return this.#accommodation.createAccommodation(businessId, data, identity)
  }

  async attachAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.attachAccommodation(businessId, accommodationId, identity)
  }

  async detachAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.detachAccommodation(businessId, accommodationId, identity)
  }

  async archiveAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.archiveAccommodation(businessId, accommodationId, identity)
  }

  async publishAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.publishAccommodation(businessId, accommodationId, identity)
  }

  async hideAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.hideAccommodation(businessId, accommodationId, identity)
  }

  async restoreAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.restoreAccommodation(businessId, accommodationId, identity)
  }

  async deleteAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.deleteAccommodation(businessId, accommodationId, identity)
  }

  async duplicateAccommodation(businessId, accommodationId, identity) {
    return this.#accommodation.duplicateAccommodation(businessId, accommodationId, identity)
  }

  async countAccommodations(businessId) {
    return this.#accommodation.countAccommodations(businessId)
  }

  async countPublished(businessId) {
    return this.#accommodation.countPublished(businessId)
  }

  async countDraft(businessId) {
    return this.#accommodation.countDraft(businessId)
  }

  async countArchived(businessId) {
    return this.#accommodation.countArchived(businessId)
  }

  async listAccommodations(businessId, options) {
    return this.#accommodation.listAccommodations(businessId, options)
  }

  async listPublished(businessId) {
    return this.#accommodation.listPublished(businessId)
  }

  async listHidden(businessId) {
    return this.#accommodation.listHidden(businessId)
  }

  async getAccommodationStatistics(businessId) {
    return this.#accommodation.getStatistics(businessId)
  }

  // ── Availability Delegation ──

  async getAccommodationAvailability(accommodationId, startDate, endDate, identity) {
    return this.#availability.getAccommodationAvailability(accommodationId, startDate, endDate, identity)
  }

  async getAccommodationOccupancy(accommodationId, startDate, endDate, identity) {
    return this.#availability.getAccommodationOccupancy(accommodationId, startDate, endDate, identity)
  }

  async checkAccommodationAvailability(accommodationId, checkIn, checkOut, identity) {
    return this.#availability.checkAccommodationAvailability(accommodationId, checkIn, checkOut, identity)
  }

  async getAccommodationCalendarSummary(accommodationId, startDate, endDate, identity) {
    return this.#availability.getAccommodationCalendarSummary(accommodationId, startDate, endDate, identity)
  }

  async blockAccommodation(accommodationId, startDate, endDate, reason, identity) {
    return this.#availability.blockAccommodation(accommodationId, startDate, endDate, reason, identity)
  }

  async unblockAccommodation(accommodationId, startDate, endDate, identity) {
    return this.#availability.unblockAccommodation(accommodationId, startDate, endDate, identity)
  }

  async reserveAccommodation(accommodationId, checkIn, checkOut, reservationId, identity) {
    return this.#availability.reserveAccommodation(accommodationId, checkIn, checkOut, reservationId, identity)
  }

  async releaseReservation(accommodationId, checkIn, checkOut, identity) {
    return this.#availability.releaseReservation(accommodationId, checkIn, checkOut, identity)
  }

  async applySeason(accommodationId, seasonData, identity) {
    return this.#availability.applySeason(accommodationId, seasonData, identity)
  }

  async removeSeason(seasonId, identity) {
    return this.#availability.removeSeason(seasonId, identity)
  }

  async applyRule(accommodationId, ruleData, identity) {
    return this.#availability.applyRule(accommodationId, ruleData, identity)
  }

  async removeRule(ruleId, identity) {
    return this.#availability.removeRule(ruleId, identity)
  }

  async updateAvailabilityRule(ruleId, ruleData, identity) {
    return this.#availability.updateRule(ruleId, ruleData, identity)
  }

  async createAvailabilityWindow(accommodationId, windowData, identity) {
    return this.#availability.createWindow(accommodationId, windowData, identity)
  }

  async createAvailabilityBlock(accommodationId, blockData, identity) {
    return this.#availability.createBlock(accommodationId, blockData, identity)
  }

  async getBusinessAvailability(businessId, startDate, endDate, identity) {
    return this.#availability.getBusinessAvailability(businessId, startDate, endDate, identity)
  }

  async getBusinessCalendar(businessId, startDate, endDate, identity) {
    return this.#availability.getBusinessCalendar(businessId, startDate, endDate, identity)
  }

  async getBusinessOccupancy(businessId, startDate, endDate, identity) {
    return this.#availability.getBusinessOccupancy(businessId, startDate, endDate, identity)
  }

  async blockMany(businessId, accommodationIds, startDate, endDate, reason, identity) {
    return this.#availability.blockMany(businessId, accommodationIds, startDate, endDate, reason, identity)
  }

  async unblockMany(businessId, accommodationIds, startDate, endDate, identity) {
    return this.#availability.unblockMany(businessId, accommodationIds, startDate, endDate, identity)
  }

  async copyAvailability(sourceAccommodationId, targetAccommodationId, startDate, endDate, identity) {
    return this.#availability.copyAvailability(sourceAccommodationId, targetAccommodationId, startDate, endDate, identity)
  }

  async duplicateCalendar(sourceBusinessId, targetBusinessId, startDate, endDate, identity) {
    return this.#availability.duplicateCalendar(sourceBusinessId, targetBusinessId, startDate, endDate, identity)
  }

  async bulkAvailabilityUpdate(businessId, updates, identity) {
    return this.#availability.bulkAvailabilityUpdate(businessId, updates, identity)
  }

  async recalculateOccupancy(businessId, identity) {
    return this.#availability.recalculateOccupancy(businessId, identity)
  }

  async syncAvailabilityStatistics(businessId, identity) {
    return this.#availability.syncAvailabilityStatistics(businessId, identity)
  }

  async refreshBusinessAvailability(businessId, identity) {
    return this.#availability.refreshBusinessAvailability(businessId, identity)
  }

  async getDailyCalendar(businessId, date, identity) {
    return this.#availability.getDailyCalendar(businessId, date, identity)
  }

  async getWeeklyCalendar(businessId, weekStart, identity) {
    return this.#availability.getWeeklyCalendar(businessId, weekStart, identity)
  }

  async getMonthlyCalendar(businessId, monthStart, identity) {
    return this.#availability.getMonthlyCalendar(businessId, monthStart, identity)
  }

  async getTimeline(businessId, startDate, endDate, identity) {
    return this.#availability.getTimeline(businessId, startDate, endDate, identity)
  }

  async getOccupancyMap(businessId, startDate, endDate, identity) {
    return this.#availability.getOccupancyMap(businessId, startDate, endDate, identity)
  }

  async getAvailabilityMatrix(businessId, accommodationIds, startDate, endDate, identity) {
    return this.#availability.getAvailabilityMatrix(businessId, accommodationIds, startDate, endDate, identity)
  }

  async getAccommodationAvailabilitySummary(accommodationId, startDate, endDate, identity) {
    return this.#availability.getAccommodationSummary(accommodationId, startDate, endDate, identity)
  }

  async getBusinessAvailabilitySummary(businessId, startDate, endDate, identity) {
    return this.#availability.getBusinessSummary(businessId, startDate, endDate, identity)
  }

  // ── Reservation Delegation ──

  async createReservation(businessId, data, identity) {
    return this.#reservation.createReservation(businessId, data, identity)
  }

  async updateReservation(businessId, reservationId, data, identity) {
    return this.#reservation.updateReservation(businessId, reservationId, data, identity)
  }

  async confirmReservation(businessId, reservationId, identity) {
    return this.#reservation.confirmReservation(businessId, reservationId, identity)
  }

  async rejectReservation(businessId, reservationId, reason, identity) {
    return this.#reservation.rejectReservation(businessId, reservationId, reason, identity)
  }

  async cancelReservation(businessId, reservationId, reason, identity) {
    return this.#reservation.cancelReservation(businessId, reservationId, reason, identity)
  }

  async expireReservation(businessId, reservationId, identity) {
    return this.#reservation.expireReservation(businessId, reservationId, identity)
  }

  async checkInReservation(businessId, reservationId, identity) {
    return this.#reservation.checkIn(businessId, reservationId, identity)
  }

  async checkOutReservation(businessId, reservationId, identity) {
    return this.#reservation.checkOut(businessId, reservationId, identity)
  }

  async noShowReservation(businessId, reservationId, identity) {
    return this.#reservation.noShow(businessId, reservationId, identity)
  }

  async archiveReservation(businessId, reservationId, identity) {
    return this.#reservation.archiveReservation(businessId, reservationId, identity)
  }

  async restoreReservation(businessId, reservationId, identity) {
    return this.#reservation.restoreReservation(businessId, reservationId, identity)
  }

  async deleteReservation(businessId, reservationId, identity) {
    return this.#reservation.deleteReservation(businessId, reservationId, identity)
  }

  async getReservation(businessId, reservationId, identity) {
    return this.#reservation.getReservation(businessId, reservationId, identity)
  }

  async getReservations(businessId, filter, identity) {
    return this.#reservation.getReservations(businessId, filter, identity)
  }

  async findByVisitor(businessId, visitorId, identity) {
    return this.#reservation.findByVisitor(businessId, visitorId, identity)
  }

  async findByAccommodation(businessId, accommodationId, identity) {
    return this.#reservation.findByAccommodation(businessId, accommodationId, identity)
  }

  async findPendingReservations(businessId, identity) {
    return this.#reservation.findPending(businessId, identity)
  }

  async findConfirmedReservations(businessId, identity) {
    return this.#reservation.findConfirmed(businessId, identity)
  }

  async findCheckedInReservations(businessId, identity) {
    return this.#reservation.findCheckedIn(businessId, identity)
  }

  async findCompletedReservations(businessId, identity) {
    return this.#reservation.findCompleted(businessId, identity)
  }

  async findCancelledReservations(businessId, identity) {
    return this.#reservation.findCancelled(businessId, identity)
  }

  async findArchivedReservations(businessId, identity) {
    return this.#reservation.findArchived(businessId, identity)
  }

  async getUpcomingReservations(businessId, identity) {
    return this.#reservation.getUpcomingReservations(businessId, identity)
  }

  async getTodayArrivals(businessId, identity) {
    return this.#reservation.getTodayArrivals(businessId, identity)
  }

  async getTodayDepartures(businessId, identity) {
    return this.#reservation.getTodayDepartures(businessId, identity)
  }

  async getCurrentGuests(businessId, identity) {
    return this.#reservation.getCurrentGuests(businessId, identity)
  }

  async getReservationTimeline(businessId, startDate, endDate, identity) {
    return this.#reservation.getReservationTimeline(businessId, startDate, endDate, identity)
  }

  async getReservationDashboard(businessId, identity) {
    return this.#reservation.getReservationDashboard(businessId, identity)
  }

  async calculateOccupancy(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateOccupancy(businessId, startDate, endDate, identity)
  }

  async calculateRevenue(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateRevenue(businessId, startDate, endDate, identity)
  }

  async calculateADR(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateADR(businessId, startDate, endDate, identity)
  }

  async calculateRevPAR(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateRevPAR(businessId, startDate, endDate, identity)
  }

  async calculateAverageStay(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateAverageStay(businessId, startDate, endDate, identity)
  }

  async calculateCancellationRate(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateCancellationRate(businessId, startDate, endDate, identity)
  }

  async calculateNoShowRate(businessId, startDate, endDate, identity) {
    return this.#reservation.calculateNoShowRate(businessId, startDate, endDate, identity)
  }

  async refreshReservationStatistics(businessId, identity) {
    return this.#reservation.refreshReservationStatistics(businessId, identity)
  }

  async bulkCancelReservations(businessId, reservationIds, reason, identity) {
    return this.#reservation.bulkCancel(businessId, reservationIds, reason, identity)
  }

  async bulkArchiveReservations(businessId, reservationIds, identity) {
    return this.#reservation.bulkArchive(businessId, reservationIds, identity)
  }

  async bulkRestoreReservations(businessId, reservationIds, identity) {
    return this.#reservation.bulkRestore(businessId, reservationIds, identity)
  }

  async bulkConfirmReservations(businessId, reservationIds, identity) {
    return this.#reservation.bulkConfirm(businessId, reservationIds, identity)
  }

  async calculateReservationPrice(businessId, accommodationId, checkIn, checkOut, guests, identity) {
    return this.#reservation.calculateReservationPrice(businessId, accommodationId, checkIn, checkOut, guests, identity)
  }

  async validateReservationAvailability(businessId, accommodationId, checkIn, checkOut, identity) {
    return this.#reservation.validateAvailability(businessId, accommodationId, checkIn, checkOut, identity)
  }

  async estimateReservationTaxes(businessId, totalPrice, identity) {
    return this.#reservation.estimateTaxes(businessId, totalPrice, identity)
  }

  async estimateReservationCommission(businessId, totalPrice, identity) {
    return this.#reservation.estimateCommission(businessId, totalPrice, identity)
  }

  // ── Visitor Delegation ──

  async createVisitor(businessId, data, identity) {
    return this.#visitor.createVisitor(businessId, data, identity)
  }

  async updateVisitor(businessId, visitorId, data, identity) {
    return this.#visitor.updateVisitor(businessId, visitorId, data, identity)
  }

  async archiveVisitor(businessId, visitorId, identity) {
    return this.#visitor.archiveVisitor(businessId, visitorId, identity)
  }

  async restoreVisitor(businessId, visitorId, identity) {
    return this.#visitor.restoreVisitor(businessId, visitorId, identity)
  }

  async deleteVisitor(businessId, visitorId, identity) {
    return this.#visitor.deleteVisitor(businessId, visitorId, identity)
  }

  async mergeVisitors(businessId, targetId, sourceId, identity) {
    return this.#visitor.mergeVisitors(businessId, targetId, sourceId, identity)
  }

  async activateVisitor(businessId, visitorId, identity) {
    return this.#visitor.activateVisitor(businessId, visitorId, identity)
  }

  async deactivateVisitor(businessId, visitorId, identity) {
    return this.#visitor.deactivateVisitor(businessId, visitorId, identity)
  }

  async verifyVisitor(businessId, visitorId, identity) {
    return this.#visitor.verifyVisitor(businessId, visitorId, identity)
  }

  async grantVip(businessId, visitorId, identity) {
    return this.#visitor.grantVip(businessId, visitorId, identity)
  }

  async revokeVip(businessId, visitorId, identity) {
    return this.#visitor.revokeVip(businessId, visitorId, identity)
  }

  async blacklistVisitor(businessId, visitorId, reason, identity) {
    return this.#visitor.blacklistVisitor(businessId, visitorId, reason, identity)
  }

  async unblacklistVisitor(businessId, visitorId, identity) {
    return this.#visitor.unblacklistVisitor(businessId, visitorId, identity)
  }

  async updateVisitorProfile(businessId, visitorId, profile, identity) {
    return this.#visitor.updateVisitorProfile(businessId, visitorId, profile, identity)
  }

  async updateVisitorPreferences(businessId, visitorId, preferences, identity) {
    return this.#visitor.updateVisitorPreferences(businessId, visitorId, preferences, identity)
  }

  async updateVisitorTags(businessId, visitorId, tags, identity) {
    return this.#visitor.updateVisitorTags(businessId, visitorId, tags, identity)
  }

  async getVisitor(businessId, visitorId, identity) {
    return this.#visitor.getVisitor(businessId, visitorId, identity)
  }

  async findVisitorByEmail(businessId, email, identity) {
    return this.#visitor.findVisitorByEmail(businessId, email, identity)
  }

  async findVisitorByPhone(businessId, phone, identity) {
    return this.#visitor.findVisitorByPhone(businessId, phone, identity)
  }

  async findVisitors(businessId, filter, identity) {
    return this.#visitor.findVisitors(businessId, filter, identity)
  }

  async listVisitors(businessId, options, identity) {
    return this.#visitor.listVisitors(businessId, options, identity)
  }

  async searchVisitors(businessId, query, options, identity) {
    return this.#visitor.searchVisitors(businessId, query, options, identity)
  }

  async visitorExists(businessId, visitorId, identity) {
    return this.#visitor.visitorExists(businessId, visitorId, identity)
  }

  async countVisitors(businessId, identity) {
    return this.#visitor.countVisitors(businessId, identity)
  }

  async getBusinessVisitors(businessId, identity) {
    return this.#visitor.getBusinessVisitors(businessId, identity)
  }

  async attachReservation(businessId, visitorId, reservationId, identity) {
    return this.#visitor.attachReservation(businessId, visitorId, reservationId, identity)
  }

  async detachReservation(businessId, visitorId, reservationId, identity) {
    return this.#visitor.detachReservation(businessId, visitorId, reservationId, identity)
  }

  async getVisitorReservations(businessId, visitorId, identity) {
    return this.#visitor.getVisitorReservations(businessId, visitorId, identity)
  }

  async getReservationHistory(businessId, visitorId, identity) {
    return this.#visitor.getReservationHistory(businessId, visitorId, identity)
  }

  async getCurrentReservation(businessId, visitorId, identity) {
    return this.#visitor.getCurrentReservation(businessId, visitorId, identity)
  }

  async getUpcomingReservationsByVisitor(businessId, visitorId, identity) {
    return this.#visitor.getUpcomingReservations(businessId, visitorId, identity)
  }

  async getPastReservations(businessId, visitorId, identity) {
    return this.#visitor.getPastReservations(businessId, visitorId, identity)
  }

  async calculateLifetimeValue(businessId, visitorId, identity) {
    return this.#visitor.calculateLifetimeValue(businessId, visitorId, identity)
  }

  async calculateVisitorAverageStay(businessId, visitorId, identity) {
    return this.#visitor.calculateAverageStay(businessId, visitorId, identity)
  }

  async calculateVisitorCancellationRate(businessId, visitorId, identity) {
    return this.#visitor.calculateCancellationRate(businessId, visitorId, identity)
  }

  async calculateVisitorNoShowRate(businessId, visitorId, identity) {
    return this.#visitor.calculateNoShowRate(businessId, visitorId, identity)
  }

  async getVisitorStatistics(businessId, visitorId, identity) {
    return this.#visitor.getVisitorStatistics(businessId, visitorId, identity)
  }

  async calculateBusinessVisitorMetrics(businessId, identity) {
    return this.#visitor.calculateBusinessVisitorMetrics(businessId, identity)
  }

  async refreshVisitorStatistics(businessId, identity) {
    return this.#visitor.refreshVisitorStatistics(businessId, identity)
  }

  async syncVisitorStatistics(businessId, identity) {
    return this.#visitor.syncVisitorStatistics(businessId, identity)
  }

  async calculateVisitorSegments(businessId, identity) {
    return this.#visitor.calculateVisitorSegments(businessId, identity)
  }

  async calculateTopVisitors(businessId, limit, identity) {
    return this.#visitor.calculateTopVisitors(businessId, limit, identity)
  }

  async calculateReturningVisitors(businessId, identity) {
    return this.#visitor.calculateReturningVisitors(businessId, identity)
  }

  async calculateVipVisitors(businessId, identity) {
    return this.#visitor.calculateVipVisitors(businessId, identity)
  }

  async archiveManyVisitors(businessId, visitorIds, identity) {
    return this.#visitor.archiveManyVisitors(businessId, visitorIds, identity)
  }

  async restoreManyVisitors(businessId, visitorIds, identity) {
    return this.#visitor.restoreManyVisitors(businessId, visitorIds, identity)
  }

  async deleteManyVisitors(businessId, visitorIds, identity) {
    return this.#visitor.deleteManyVisitors(businessId, visitorIds, identity)
  }

  async mergeManyVisitors(businessId, visitorIds, identity) {
    return this.#visitor.mergeManyVisitors(businessId, visitorIds, identity)
  }

  async tagManyVisitors(businessId, visitorIds, tag, identity) {
    return this.#visitor.tagManyVisitors(businessId, visitorIds, tag, identity)
  }

  async exportVisitors(businessId, options, identity) {
    return this.#visitor.exportVisitors(businessId, options, identity)
  }

  async refreshVisitorSearch(businessId, identity) {
    return this.#visitor.refreshVisitorSearch(businessId, identity)
  }

  // ── Payment Delegation ──

  async createPayment(businessId, data, identity) {
    return this.#payment.createPayment(businessId, data, identity)
  }

  async updatePayment(businessId, paymentId, data, identity) {
    return this.#payment.updatePayment(businessId, paymentId, data, identity)
  }

  async authorizePayment(businessId, paymentId, identity) {
    return this.#payment.authorizePayment(businessId, paymentId, identity)
  }

  async capturePayment(businessId, paymentId, identity) {
    return this.#payment.capturePayment(businessId, paymentId, identity)
  }

  async markPaid(businessId, paymentId, amount, identity) {
    return this.#payment.markPaid(businessId, paymentId, amount, identity)
  }

  async cancelPayment(businessId, paymentId, identity) {
    return this.#payment.cancelPayment(businessId, paymentId, identity)
  }

  async expirePayment(businessId, paymentId, identity) {
    return this.#payment.expirePayment(businessId, paymentId, identity)
  }

  async refundPayment(businessId, paymentId, amount, identity, reason) {
    return this.#payment.refundPayment(businessId, paymentId, amount, identity, reason)
  }

  async partialRefundPayment(businessId, paymentId, amount, identity, reason) {
    return this.#payment.partialRefundPayment(businessId, paymentId, amount, identity, reason)
  }

  async archivePayment(businessId, paymentId, identity) {
    return this.#payment.archivePayment(businessId, paymentId, identity)
  }

  async restorePayment(businessId, paymentId, identity) {
    return this.#payment.restorePayment(businessId, paymentId, identity)
  }

  async deletePayment(businessId, paymentId, identity) {
    return this.#payment.deletePayment(businessId, paymentId, identity)
  }

  async findPayment(businessId, paymentId, identity) {
    return this.#payment.findPayment(businessId, paymentId, identity)
  }

  async findPayments(businessId, filter, identity) {
    return this.#payment.findPayments(businessId, filter, identity)
  }

  async findPaymentByReservation(businessId, reservationId, identity) {
    return this.#payment.findPaymentByReservation(businessId, reservationId, identity)
  }

  async findPaymentsByVisitor(businessId, visitorId, identity) {
    return this.#payment.findPaymentsByVisitor(businessId, visitorId, identity)
  }

  async findPendingPayments(businessId, identity) {
    return this.#payment.findPendingPayments(businessId, identity)
  }

  async findPaidPayments(businessId, identity) {
    return this.#payment.findPaidPayments(businessId, identity)
  }

  async findFailedPayments(businessId, identity) {
    return this.#payment.findFailedPayments(businessId, identity)
  }

  async findRefundedPayments(businessId, identity) {
    return this.#payment.findRefundedPayments(businessId, identity)
  }

  async findExpiredPayments(businessId, identity) {
    return this.#payment.findExpiredPayments(businessId, identity)
  }

  async getPayment(businessId, paymentId, identity) {
    return this.#payment.getPayment(businessId, paymentId, identity)
  }

  async getBusinessPayments(businessId, identity) {
    return this.#payment.getBusinessPayments(businessId, identity)
  }

  async paymentExists(businessId, paymentId, identity) {
    return this.#payment.paymentExists(businessId, paymentId, identity)
  }

  async countPayments(businessId, identity) {
    return this.#payment.countPayments(businessId, identity)
  }

  async getBusinessRevenue(businessId, identity) {
    return this.#payment.getBusinessRevenue(businessId, identity)
  }

  async getBusinessOutstandingPayments(businessId, identity) {
    return this.#payment.getBusinessOutstandingPayments(businessId, identity)
  }

  async getBusinessRefunds(businessId, identity) {
    return this.#payment.getBusinessRefunds(businessId, identity)
  }

  async getBusinessCommissions(businessId, identity) {
    return this.#payment.getBusinessCommissions(businessId, identity)
  }

  async getBusinessPaymentStatistics(businessId, identity) {
    return this.#payment.getBusinessPaymentStatistics(businessId, identity)
  }

  async getBusinessPaymentSummary(businessId, identity) {
    return this.#payment.getBusinessPaymentSummary(businessId, identity)
  }

  async getBusinessCashFlow(businessId, startDate, endDate, identity) {
    return this.#payment.getBusinessCashFlow(businessId, startDate, endDate, identity)
  }

  async getBusinessRevenueByPeriod(businessId, period, identity) {
    return this.#payment.getBusinessRevenueByPeriod(businessId, period, identity)
  }

  async getBusinessPaymentDashboard(businessId, identity) {
    return this.#payment.getBusinessPaymentDashboard(businessId, identity)
  }

  async createReservationPayment(businessId, reservationId, data, identity) {
    return this.#payment.createReservationPayment(businessId, reservationId, data, identity)
  }

  async cancelReservationPayment(businessId, reservationId, identity) {
    return this.#payment.cancelReservationPayment(businessId, reservationId, identity)
  }

  async expireReservationPayment(businessId, reservationId, identity) {
    return this.#payment.expireReservationPayment(businessId, reservationId, identity)
  }

  async refundReservationPayment(businessId, reservationId, amount, identity, reason) {
    return this.#payment.refundReservationPayment(businessId, reservationId, amount, identity, reason)
  }

  async findReservationPayment(businessId, reservationId, identity) {
    return this.#payment.findReservationPayment(businessId, reservationId, identity)
  }

  async getVisitorPayments(businessId, visitorId, identity) {
    return this.#payment.getVisitorPayments(businessId, visitorId, identity)
  }

  async getVisitorOutstandingBalance(businessId, visitorId, identity) {
    return this.#payment.getVisitorOutstandingBalance(businessId, visitorId, identity)
  }

  async getVisitorPaymentHistory(businessId, visitorId, identity) {
    return this.#payment.getVisitorPaymentHistory(businessId, visitorId, identity)
  }

  async refundVisitorPayments(businessId, visitorId, paymentIds, amount, identity, reason) {
    return this.#payment.refundVisitorPayments(businessId, visitorId, paymentIds, amount, identity, reason)
  }

  async archiveBusinessPayments(businessId, paymentIds, identity) {
    return this.#payment.archiveBusinessPayments(businessId, paymentIds, identity)
  }

  async restoreBusinessPayments(businessId, paymentIds, identity) {
    return this.#payment.restoreBusinessPayments(businessId, paymentIds, identity)
  }

  async cancelPendingPayments(businessId, paymentIds, identity) {
    return this.#payment.cancelPendingPayments(businessId, paymentIds, identity)
  }

  async expirePendingPayments(businessId, paymentIds, identity) {
    return this.#payment.expirePendingPayments(businessId, paymentIds, identity)
  }

  async bulkRefundPayments(businessId, paymentIds, amounts, identity, reason) {
    return this.#payment.bulkRefundPayments(businessId, paymentIds, amounts, identity, reason)
  }

  async cancelAllPendingPayments(businessId, identity) {
    return this.#payment.cancelAllPendingPayments(businessId, identity)
  }

  async expireAllPendingPayments(businessId, identity) {
    return this.#payment.expireAllPendingPayments(businessId, identity)
  }

  async refreshPaymentSearch(businessId, identity) {
    return this.#payment.refreshPaymentSearch(businessId, identity)
  }

  async refreshPaymentStatistics(businessId, identity) {
    return this.#payment.refreshPaymentStatistics(businessId, identity)
  }

  async getRefundEligibility(businessId, paymentId, identity) {
    return this.#payment.getRefundEligibility(businessId, paymentId, identity)
  }

  async calculateFees(businessId, subtotal, options, identity) {
    return this.#payment.calculateFees(businessId, subtotal, options, identity)
  }

  // ── Notification API ──

  async createNotification(businessId, data, identity) {
    return this.#notification.createNotification(businessId, data, identity)
  }

  async updateNotification(businessId, notificationId, data, identity) {
    return this.#notification.updateNotification(businessId, notificationId, data, identity)
  }

  async scheduleNotification(businessId, notificationId, scheduledAt, identity) {
    return this.#notification.scheduleNotification(businessId, notificationId, scheduledAt, identity)
  }

  async sendNotification(businessId, notificationId, identity) {
    return this.#notification.sendNotification(businessId, notificationId, identity)
  }

  async cancelNotification(businessId, notificationId, identity) {
    return this.#notification.cancelNotification(businessId, notificationId, identity)
  }

  async retryNotification(businessId, notificationId, identity) {
    return this.#notification.retryNotification(businessId, notificationId, identity)
  }

  async archiveNotification(businessId, notificationId, identity) {
    return this.#notification.archiveNotification(businessId, notificationId, identity)
  }

  async restoreNotification(businessId, notificationId, identity) {
    return this.#notification.restoreNotification(businessId, notificationId, identity)
  }

  async deleteNotification(businessId, notificationId, identity) {
    return this.#notification.deleteNotification(businessId, notificationId, identity)
  }

  async markSent(businessId, notificationId, identity) {
    return this.#notification.markSent(businessId, notificationId, identity)
  }

  async markDelivered(businessId, notificationId, identity) {
    return this.#notification.markDelivered(businessId, notificationId, identity)
  }

  async markFailed(businessId, notificationId, errorMessage, identity) {
    return this.#notification.markFailed(businessId, notificationId, errorMessage, identity)
  }

  async findNotification(businessId, notificationId, identity) {
    return this.#notification.findNotification(businessId, notificationId, identity)
  }

  async findNotifications(businessId, filter, identity) {
    return this.#notification.findNotifications(businessId, filter, identity)
  }

  async findBusinessNotifications(businessId, identity) {
    return this.#notification.findBusinessNotifications(businessId, identity)
  }

  async findPendingNotifications(businessId, identity) {
    return this.#notification.findPendingNotifications(businessId, identity)
  }

  async findScheduledNotifications(businessId, identity) {
    return this.#notification.findScheduledNotifications(businessId, identity)
  }

  async findSentNotifications(businessId, identity) {
    return this.#notification.findSentNotifications(businessId, identity)
  }

  async findFailedNotifications(businessId, identity) {
    return this.#notification.findFailedNotifications(businessId, identity)
  }

  async findDeliveredNotifications(businessId, identity) {
    return this.#notification.findDeliveredNotifications(businessId, identity)
  }

  async notificationExists(businessId, notificationId, identity) {
    return this.#notification.notificationExists(businessId, notificationId, identity)
  }

  async countNotifications(businessId, identity) {
    return this.#notification.countNotifications(businessId, identity)
  }

  async createReservationNotification(businessId, reservationId, data, identity) {
    return this.#notification.createReservationNotification(businessId, reservationId, data, identity)
  }

  async cancelReservationNotifications(businessId, reservationId, identity) {
    return this.#notification.cancelReservationNotifications(businessId, reservationId, identity)
  }

  async findReservationNotifications(businessId, reservationId, identity) {
    return this.#notification.findReservationNotifications(businessId, reservationId, identity)
  }

  async scheduleReservationReminder(businessId, reservationId, reminderData, identity) {
    return this.#notification.scheduleReservationReminder(businessId, reservationId, reminderData, identity)
  }

  async sendReservationConfirmation(businessId, reservationId, identity) {
    return this.#notification.sendReservationConfirmation(businessId, reservationId, identity)
  }

  async sendReservationCancellation(businessId, reservationId, identity) {
    return this.#notification.sendReservationCancellation(businessId, reservationId, identity)
  }

  async createPaymentNotification(businessId, paymentId, data, identity) {
    return this.#notification.createPaymentNotification(businessId, paymentId, data, identity)
  }

  async sendPaymentReceipt(businessId, paymentId, identity) {
    return this.#notification.sendPaymentReceipt(businessId, paymentId, identity)
  }

  async sendRefundNotification(businessId, paymentId, identity) {
    return this.#notification.sendRefundNotification(businessId, paymentId, identity)
  }

  async findPaymentNotifications(businessId, paymentId, identity) {
    return this.#notification.findPaymentNotifications(businessId, paymentId, identity)
  }

  async findVisitorNotifications(businessId, visitorId, identity) {
    return this.#notification.findVisitorNotifications(businessId, visitorId, identity)
  }

  async findUnreadVisitorNotifications(businessId, visitorId, identity) {
    return this.#notification.findUnreadVisitorNotifications(businessId, visitorId, identity)
  }

  async markVisitorNotificationsRead(businessId, visitorId, identity) {
    return this.#notification.markVisitorNotificationsRead(businessId, visitorId, identity)
  }

  async sendVisitorNotification(businessId, visitorId, data, identity) {
    return this.#notification.sendVisitorNotification(businessId, visitorId, data, identity)
  }

  async getNotificationStatistics(businessId, identity) {
    return this.#notification.getNotificationStatistics(businessId, identity)
  }

  async getBusinessNotificationSummary(businessId, identity) {
    return this.#notification.getBusinessNotificationSummary(businessId, identity)
  }

  async getDeliveryRate(businessId, identity) {
    return this.#notification.getDeliveryRate(businessId, identity)
  }

  async getFailureRate(businessId, identity) {
    return this.#notification.getFailureRate(businessId, identity)
  }

  async getChannelStatistics(businessId, identity) {
    return this.#notification.getChannelStatistics(businessId, identity)
  }

  async getTemplateStatistics(businessId, identity) {
    return this.#notification.getTemplateStatistics(businessId, identity)
  }

  async getDailyNotificationVolume(businessId, days, identity) {
    return this.#notification.getDailyNotificationVolume(businessId, days, identity)
  }

  async getNotificationDashboard(businessId, identity) {
    return this.#notification.getNotificationDashboard(businessId, identity)
  }

  async archiveBusinessNotifications(businessId, notificationIds, identity) {
    return this.#notification.archiveBusinessNotifications(businessId, notificationIds, identity)
  }

  async restoreBusinessNotifications(businessId, notificationIds, identity) {
    return this.#notification.restoreBusinessNotifications(businessId, notificationIds, identity)
  }

  async cancelPendingNotifications(businessId, notificationIds, identity) {
    return this.#notification.cancelPendingNotifications(businessId, notificationIds, identity)
  }

  async retryFailedNotifications(businessId, notificationIds, identity) {
    return this.#notification.retryFailedNotifications(businessId, notificationIds, identity)
  }

  async markAllDelivered(businessId, notificationIds, identity) {
    return this.#notification.markAllDelivered(businessId, notificationIds, identity)
  }

  async cleanupArchivedNotifications(businessId, daysOld, identity) {
    return this.#notification.cleanupArchivedNotifications(businessId, daysOld, identity)
  }

  async refreshNotificationSearch(businessId, identity) {
    return this.#notification.refreshNotificationSearch(businessId, identity)
  }

  async refreshNotificationStatistics(businessId, identity) {
    return this.#notification.refreshNotificationStatistics(businessId, identity)
  }

  async calculateNotificationCosts(businessId, options, identity) {
    return this.#notification.calculateNotificationCosts(businessId, options, identity)
  }

  async estimateNotificationVolume(businessId, options, identity) {
    return this.#notification.estimateNotificationVolume(businessId, options, identity)
  }
}
